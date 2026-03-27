import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  dbRowToContact,
  deleteContactIds,
  fetchAllContacts,
  insertContact,
  syncContactsDelta,
  updateContactField,
  type DbContactRow,
} from '../../api/contactsRepository';
import { readStoredUserName } from '../../lib/auth/accessStorage';
import { columnIndex, COLUMN_LABELS, COLUMN_ORDER, type DataColumnKey } from '../../constants/tableColumns';
import { useContactsDerived } from '../../hooks/contacts/useContactsDerived';
import { useContactsPersistence } from '../../hooks/contacts/useContactsPersistence';
import { parseClipboardInput } from '../../lib/clipboard/parseClipboardInput';
import { getSupabase, getSupabaseBootstrapInfo, isSupabaseConfigured } from '../../lib/supabase/client';
import { downloadTextFile, exportContactsToCsv, importContactsFromDelimitedText, importContactsFromXlsxFile } from '../../lib/importExport';
import type { ApplyPasteGridOptions } from '../../lib/paste/applyPasteGrid';
import { applyPasteGrid } from '../../lib/paste/applyPasteGrid';
import { formatPasteReport } from '../../lib/paste/formatPasteReport';
import { defaultPersistence } from '../../storage/persistence';
import type { ContactRow, SortKey } from '../../types/contact';
import type { PasteApplyMode, PasteDelimiter } from '../../types/paste';
import { deleteOtherRowsInDuplicateGroup, findDuplicatePhones } from '../../utils/findDuplicatePhones';
import { insertRowSortedByCreatedAt } from '../../utils/contactRowDiff';
import { createEmptyRow } from '../../utils/newRow';
import type { RowFilter } from '../../utils/rowQuery';
import { useToast } from '../system/ToastProvider';
import { BulkImportModal } from './BulkImportModal';
import { ContactsTable, type ContactsTableHandle } from './ContactsTable';
import { DuplicatePanel } from './DuplicatePanel';
import { PastePreviewModal } from './PastePreviewModal';
import { TableStatusBar } from './TableStatusBar';
import { Toolbar } from './Toolbar';
import { WorkspaceHero } from './WorkspaceHero';

type SortState = { key: SortKey | null; dir: 'asc' | 'desc' };

type PasteModalState = {
  grid: string[][];
  delimiter: PasteDelimiter;
  reason?: string;
  rowId: string;
  startCol: number;
};

type BulkImportSnapshot = { rowId: string };

function buildActiveRowSummary(
  selectedId: string | null,
  pasteAnchor: { rowId: string; field: DataColumnKey } | null,
  visibleRows: { id: string }[],
): string | null {
  if (!selectedId) return null;
  const vi = visibleRows.findIndex((r) => r.id === selectedId);
  const field =
    pasteAnchor && pasteAnchor.rowId === selectedId ? pasteAnchor.field : 'phone';
  const col = COLUMN_LABELS[field];
  if (vi >= 0) return `Активна на экране: №${vi + 1} · «${col}»`;
  return `Активна (вне фильтра) · «${col}»`;
}

type ContactsWorkspaceProps = {
  onChangeAccessKey: () => void;
};

export function ContactsWorkspace({ onChangeAccessKey }: ContactsWorkspaceProps) {
  const toast = useToast();
  const tableRef = useRef<ContactsTableHandle>(null);
  const sessionOwner = useMemo(() => readStoredUserName(), []);

  const [rows, setRows] = useState<ContactRow[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(() => new Set());
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<RowFilter>('all');
  const [sort, setSort] = useState<SortState>({ key: null, dir: 'asc' });
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact');
  const [pasteModal, setPasteModal] = useState<PasteModalState | null>(null);
  const [pasteBusy, setPasteBusy] = useState(false);
  const [pasteAnchor, setPasteAnchor] = useState<{ rowId: string; field: DataColumnKey } | null>(null);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkImportSnapshot, setBulkImportSnapshot] = useState<BulkImportSnapshot | null>(null);
  const [dupPanelOpen, setDupPanelOpen] = useState(false);
  /** Ошибка первичной загрузки / refetch при включённом Supabase (не смешиваем с локальной фиктивной строкой). */
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);

  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const { duplicateInfo, visibleRows, citySuggestions } = useContactsDerived(rows, search, filter, sort);

  /** Вторичный кэш (LS + IndexedDB); источник правды при Supabase — база. */
  useContactsPersistence(rows, hydrated);

  const refetchContacts = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    try {
      let data = await fetchAllContacts();
      if (data.length === 0) {
        const row = createEmptyRow({ owner: readStoredUserName() });
        await insertContact(row);
        data = [row];
      }
      setCloudSyncError(null);
      setRows(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Неизвестная ошибка';
      console.error('[ContactsWorkspace] refetchContacts', e);
      setCloudSyncError(msg);
      toast.push({
        variant: 'error',
        title: 'Не удалось обновить таблицу',
        body: msg,
      });
    }
  }, [toast]);

  const refetchContactsRef = useRef(refetchContacts);
  refetchContactsRef.current = refetchContacts;

  useEffect(() => {
    let cancelled = false;
    if (!isSupabaseConfigured()) {
      void defaultPersistence.load().then((data) => {
        if (cancelled) return;
        if (data && data.length > 0) setRows(data);
        else setRows([createEmptyRow({ owner: readStoredUserName() })]);
        setHydrated(true);
      });
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        let data = await fetchAllContacts();
        if (cancelled) return;
        if (data.length === 0) {
          const row = createEmptyRow({ owner: readStoredUserName() });
          await insertContact(row);
          data = [row];
        }
        setCloudSyncError(null);
        setRows(data);
      } catch (e) {
        if (!cancelled) {
          console.error('[ContactsWorkspace] initial cloud load', e);
          const msg = e instanceof Error ? e.message : 'Неизвестная ошибка';
          setCloudSyncError(
            `${msg} Проверьте таблицу contacts, RLS и ключи в Cloudflare Pages (переменные должны быть заданы на этапе сборки).`,
          );
          toast.push({
            variant: 'error',
            title: 'Не удалось загрузить контакты из облака',
            body: 'Проверьте VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY и SQL-скрипт в Supabase.',
          });
          setRows([]);
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- загрузка один раз при монтировании
  }, []);

  useEffect(() => {
    if (!hydrated || !isSupabaseConfigured()) return;
    const sb = getSupabase();
    if (!sb) return;

    const channel = sb
      .channel('contacts-shared-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contacts' },
        (payload) => {
          setRows((prev) => {
            if (payload.eventType === 'DELETE') {
              const oldId = (payload.old as { id?: string })?.id;
              if (!oldId) return prev;
              const next = prev.filter((r) => r.id !== oldId);
              if (next.length === 0) {
                queueMicrotask(() => void refetchContactsRef.current());
                return [];
              }
              return next;
            }
            const raw = payload.new as DbContactRow;
            if (!raw?.id) return prev;
            const row = dbRowToContact(raw);
            if (payload.eventType === 'INSERT') {
              const without = prev.filter((r) => r.id !== row.id);
              return insertRowSortedByCreatedAt(without, row);
            }
            if (payload.eventType === 'UPDATE') {
              return prev.map((r) => (r.id === row.id ? row : r));
            }
            return prev;
          });
        },
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.info('[Supabase Realtime] Подписка на public.contacts активна');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(
            '[Supabase Realtime]',
            status,
            err,
            'Проверьте publication supabase_realtime для таблицы contacts (см. supabase-schema.sql).',
          );
        }
      });

    return () => {
      void sb.removeChannel(channel);
    };
  }, [hydrated]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (pasteModal) {
        setPasteModal(null);
        return;
      }
      if (bulkImportOpen) {
        setBulkImportOpen(false);
        setBulkImportSnapshot(null);
        return;
      }
      if (dupPanelOpen) {
        setDupPanelOpen(false);
        return;
      }
      setSelectedId(null);
      setBulkSelectedIds(new Set());
      setPasteAnchor(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pasteModal, bulkImportOpen, dupPanelOpen]);

  const pushPasteToast = useCallback(
    (nextRows: ContactRow[], stats: import('../../types/paste').PasteApplyStats, applyOpts?: ApplyPasteGridOptions) => {
      rowsRef.current = nextRows;
      const dup = findDuplicatePhones(nextRows);
      toast.push({
        variant: 'success',
        title: 'Вставка выполнена',
        body: formatPasteReport(
          stats,
          dup.duplicateRowIds.size,
          stats.cellsDroppedOutsideTable,
          { mode: applyOpts?.mode },
        ),
      });
    },
    [toast],
  );

  const applyGridAndToast = useCallback(
    (startRowId: string, startCol: number, grid: string[][], applyOpts?: ApplyPasteGridOptions) => {
      const ownerOpt = sessionOwner ? sessionOwner : undefined;
      const pasteOpts: ApplyPasteGridOptions = {
        ...applyOpts,
        defaultOwnerForNewRows: applyOpts?.defaultOwnerForNewRows ?? ownerOpt,
      };
      let nextSnapshot: { rows: ContactRow[]; stats: import('../../types/paste').PasteApplyStats } | null = null;
      setRows((prev) => {
        const { nextRows, stats } = applyPasteGrid(prev, startRowId, startCol, grid, pasteOpts);
        nextSnapshot = { rows: nextRows, stats };
        if (isSupabaseConfigured()) {
          const prevSnap = prev;
          queueMicrotask(() =>
            void syncContactsDelta(prevSnap, nextRows).catch(() => {
              toast.push({ variant: 'error', title: 'Вставка не сохранилась в облаке' });
              void refetchContactsRef.current();
            }),
          );
        }
        return nextRows;
      });
      if (nextSnapshot) {
        queueMicrotask(() => pushPasteToast(nextSnapshot!.rows, nextSnapshot!.stats, applyOpts));
      }
    },
    [sessionOwner, pushPasteToast, toast],
  );

  const runBulkPaste = useCallback(
    (text: string, startRowId: string, startColIndex: number, forcePreview: boolean) => {
      const parsed = parseClipboardInput(text, startColIndex);
      if (parsed.grid.length === 0) {
        toast.push({ variant: 'error', title: 'Буфер пустой или не удалось разобрать' });
        return;
      }
      if (forcePreview || parsed.needsPreview) {
        setPasteModal({
          grid: parsed.grid,
          delimiter: parsed.delimiter,
          reason: parsed.reason,
          rowId: startRowId,
          startCol: startColIndex,
        });
        return;
      }
      setPasteBusy(true);
      window.requestAnimationFrame(() => {
        applyGridAndToast(startRowId, startColIndex, parsed.grid);
        window.requestAnimationFrame(() => setPasteBusy(false));
      });
    },
    [applyGridAndToast, toast],
  );

  const onBulkPasteFromCell = useCallback(
    (rowId: string, field: DataColumnKey, text: string) => {
      runBulkPaste(text, rowId, columnIndex(field), false);
    },
    [runBulkPaste],
  );

  const handleSort = useCallback((key: SortKey) => {
    setSort((s) => {
      if (s.key !== key) return { key, dir: 'asc' };
      if (s.dir === 'asc') return { key, dir: 'desc' };
      return { key: null, dir: 'asc' };
    });
  }, []);

  const updateCell = useCallback(
    (id: string, field: DataColumnKey, value: string) => {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
      if (isSupabaseConfigured()) {
        void updateContactField(id, field, value).catch(() => {
          toast.push({ variant: 'error', title: 'Ячейка не сохранилась', body: 'Повторите или обновите страницу.' });
          void refetchContactsRef.current();
        });
      }
    },
    [toast],
  );

  const makeFallbackRow = useCallback(() => {
    return createEmptyRow(sessionOwner ? { owner: sessionOwner } : undefined);
  }, [sessionOwner]);

  const deleteRowById = useCallback(
    (id: string) => {
      if (!isSupabaseConfigured()) {
        setRows((prev) => {
          const next = prev.filter((r) => r.id !== id);
          return next.length === 0 ? [makeFallbackRow()] : next;
        });
        setSelectedId((cur) => (cur === id ? null : cur));
        setBulkSelectedIds((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        });
        return;
      }

      const prev = rowsRef.current;
      const next = prev.filter((r) => r.id !== id);
      const fallback = next.length === 0 ? makeFallbackRow() : null;
      setRows(fallback ? [fallback] : next);
      setSelectedId((cur) => (cur === id ? null : cur));
      setBulkSelectedIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });

      void (async () => {
        try {
          await deleteContactIds([id]);
          if (fallback) await insertContact(fallback);
        } catch {
          toast.push({ variant: 'error', title: 'Удаление не выполнено в облаке' });
          await refetchContactsRef.current();
        }
      })();
    },
    [makeFallbackRow, toast],
  );

  const deleteOthersInGroup = useCallback(
    (keepRowId: string) => {
      setRows((prev) => {
        const info = findDuplicatePhones(prev);
        const next = deleteOtherRowsInDuplicateGroup(prev, keepRowId, info.groups);
        if (isSupabaseConfigured()) {
          const prevSnap = prev;
          queueMicrotask(() =>
            void syncContactsDelta(prevSnap, next).catch(() => {
              toast.push({ variant: 'error', title: 'Удаление дублей не сохранилось в облаке' });
              void refetchContactsRef.current();
            }),
          );
        }
        queueMicrotask(() => {
          toast.push({
            variant: 'info',
            title: 'Дубли в группе удалены',
            body: 'Оставлена выбранная строка, остальные копии с тем же номером удалены.',
          });
          tableRef.current?.scrollToRowId(keepRowId);
        });
        return next;
      });
      setBulkSelectedIds(new Set());
    },
    [toast],
  );

  const addRow = useCallback(() => {
    const row = createEmptyRow(sessionOwner ? { owner: sessionOwner } : undefined);
    if (!isSupabaseConfigured()) {
      setRows((prev) => [...prev, row]);
      return;
    }
    setRows((prev) => [...prev, row]);
    void insertContact(row)
      .then((inserted) => {
        setCloudSyncError(null);
        setRows((prev) => prev.map((r) => (r.id === row.id ? inserted : r)));
      })
      .catch(() => {
        setRows((prev) => prev.filter((r) => r.id !== row.id));
        toast.push({ variant: 'error', title: 'Строка не создана в облаке' });
      });
  }, [sessionOwner, toast]);

  const toggleBulk = useCallback((id: string, checked: boolean) => {
    setBulkSelectedIds((prev) => {
      const n = new Set(prev);
      if (checked) n.add(id);
      else n.delete(id);
      return n;
    });
  }, []);

  const toggleAllVisible = useCallback(
    (checked: boolean) => {
      setBulkSelectedIds((prev) => {
        const n = new Set(prev);
        if (checked) for (const r of visibleRows) n.add(r.id);
        else for (const r of visibleRows) n.delete(r.id);
        return n;
      });
    },
    [visibleRows],
  );

  const bulkDelete = useCallback(() => {
    const toRemove = bulkSelectedIds;
    if (toRemove.size === 0) return;
    const n = toRemove.size;
    const ids = [...toRemove];

    if (!isSupabaseConfigured()) {
      setRows((prev) => {
        const next = prev.filter((r) => !toRemove.has(r.id));
        queueMicrotask(() =>
          toast.push({
            variant: 'info',
            title: 'Выделенные строки удалены',
            body: `Удалено: ${n}`,
          }),
        );
        return next.length === 0 ? [makeFallbackRow()] : next;
      });
      setBulkSelectedIds(new Set());
      setSelectedId(null);
      return;
    }

    const prev = rowsRef.current;
    const next = prev.filter((r) => !toRemove.has(r.id));
    const fallback = next.length === 0 ? makeFallbackRow() : null;
    setRows(fallback ? [fallback] : next);
    queueMicrotask(() =>
      toast.push({
        variant: 'info',
        title: 'Выделенные строки удалены',
        body: `Удалено: ${n}`,
      }),
    );
    setBulkSelectedIds(new Set());
    setSelectedId(null);

    void (async () => {
      try {
        await deleteContactIds(ids);
        if (fallback) await insertContact(fallback);
      } catch {
        toast.push({ variant: 'error', title: 'Массовое удаление не сохранилось в облаке' });
        await refetchContactsRef.current();
      }
    })();
  }, [bulkSelectedIds, makeFallbackRow, toast]);

  const onPasteAnchorRecord = useCallback((rowId: string, field: DataColumnKey) => {
    setPasteAnchor({ rowId, field });
  }, []);

  const resolvePasteStart = useCallback((): {
    rowId: string;
    col: number;
    field: DataColumnKey;
  } | null => {
    const rowId =
      pasteAnchor?.rowId ?? selectedId ?? visibleRows[0]?.id ?? rows[0]?.id ?? null;
    if (!rowId) return null;
    const field =
      pasteAnchor && pasteAnchor.rowId === rowId ? pasteAnchor.field : 'phone';
    return { rowId, col: columnIndex(field), field };
  }, [pasteAnchor, rows, selectedId, visibleRows]);

  const openBulkImport = useCallback(() => {
    const start = resolvePasteStart();
    if (!start) {
      toast.push({ variant: 'error', title: 'Нет строк для вставки' });
      return;
    }
    setBulkImportSnapshot({ rowId: start.rowId });
    setBulkImportOpen(true);
  }, [resolvePasteStart, toast]);

  const handleBulkImportApply = useCallback(
    (args: {
      grid: string[][];
      startRowId: string;
      startColIndex: number;
      mode: PasteApplyMode;
      prefilteredAllEmptyRows: number;
    }) => {
      setBulkImportOpen(false);
      setBulkImportSnapshot(null);
      setPasteBusy(true);
      window.requestAnimationFrame(() => {
        applyGridAndToast(args.startRowId, args.startColIndex, args.grid, {
          mode: args.mode,
          prefilteredAllEmptyRows: args.prefilteredAllEmptyRows,
        });
        window.requestAnimationFrame(() => setPasteBusy(false));
      });
    },
    [applyGridAndToast],
  );

  const onCopyRow = useCallback(
    async (row: ContactRow) => {
      const line = COLUMN_ORDER.map((k) => row[k]).join('\t');
      try {
        await navigator.clipboard.writeText(line);
        toast.push({ variant: 'success', title: 'Строка скопирована', body: 'Формат: табуляция' });
      } catch {
        toast.push({ variant: 'error', title: 'Не удалось скопировать' });
      }
    },
    [toast],
  );

  const clearFilters = useCallback(() => {
    setSearch('');
    setFilter('all');
  }, []);

  const onExportCsv = useCallback(() => {
    downloadTextFile(
      `контакты-${new Date().toISOString().slice(0, 10)}.csv`,
      exportContactsToCsv(rows),
      'text/csv;charset=utf-8',
    );
    toast.push({ variant: 'success', title: 'Файл CSV сформирован' });
  }, [rows, toast]);

  const onImportFile = useCallback(
    async (file: File) => {
      try {
        let imported: ContactRow[];
        if (file.name.toLowerCase().endsWith('.xlsx')) {
          imported = await importContactsFromXlsxFile(file);
        } else {
          const text = await file.text();
          imported = importContactsFromDelimitedText(text);
        }
        if (imported.length === 0) {
          toast.push({ variant: 'error', title: 'Нет строк для импорта' });
          return;
        }
        const ownerStamp = readStoredUserName();
        setRows((prev) => {
          const stamped = imported.map((r) => ({ ...r, owner: ownerStamp }));
          const next = [...stamped, ...prev];
          if (isSupabaseConfigured()) {
            const prevSnap = prev;
            queueMicrotask(() =>
              void syncContactsDelta(prevSnap, next).catch(() => {
                toast.push({ variant: 'error', title: 'Импорт не сохранился в облаке' });
                void refetchContactsRef.current();
              }),
            );
          }
          return next;
        });
        toast.push({
          variant: 'success',
          title: 'Импорт выполнен',
          body: `Добавлено строк: ${imported.length}`,
        });
      } catch {
        toast.push({ variant: 'error', title: 'Не удалось прочитать файл' });
      }
    },
    [toast],
  );

  const goToNextDuplicate = useCallback(() => {
    const ordered = duplicateInfo.groups.flatMap((g) => g.rowIds);
    if (ordered.length === 0) return;
    const cur = selectedId ? ordered.indexOf(selectedId) : -1;
    const next = ordered[(cur + 1) % ordered.length];
    setSelectedId(next);
    setPasteAnchor({ rowId: next, field: 'phone' });
    queueMicrotask(() => tableRef.current?.scrollToRowId(next));
  }, [duplicateInfo.groups, selectedId]);

  const jumpToDuplicateRow = useCallback((rowId: string) => {
    setSelectedId(rowId);
    setPasteAnchor({ rowId, field: 'phone' });
    queueMicrotask(() => tableRef.current?.scrollToRowId(rowId));
  }, []);

  const activeRowSummary = useMemo(
    () => buildActiveRowSummary(selectedId, pasteAnchor, visibleRows),
    [pasteAnchor, selectedId, visibleRows],
  );

  const duplicateRowsCount = duplicateInfo.duplicateRowIds.size;
  const hasPhoneConflicts = duplicateRowsCount > 0;

  if (!hydrated) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-canvas text-sm text-ink-muted">
        Загрузка данных…
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[100dvh] max-w-[1920px] flex-col gap-4 px-3 py-4 md:gap-5 md:px-6 md:py-5">
      {!isSupabaseConfigured() ? (
        <div
          role="status"
          className="shrink-0 rounded-[14px] border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-[13px] leading-relaxed text-amber-100/95 shadow-glow sm:px-5"
        >
          <strong className="font-semibold text-amber-50">Локальный режим.</strong> Данные хранятся только в этом браузере
          (IndexedDB / localStorage), общая таблица для всех пользователей не используется.
          <span className="mt-2 block text-amber-100/85">{getSupabaseBootstrapInfo().message}</span>
          <span className="mt-2 block text-[12px] text-amber-100/70">
            В Cloudflare Pages задайте <code className="rounded bg-canvas/80 px-1 py-0.5 font-mono text-[11px]">VITE_SUPABASE_URL</code> и{' '}
            <code className="rounded bg-canvas/80 px-1 py-0.5 font-mono text-[11px]">VITE_SUPABASE_ANON_KEY</code> для среды{' '}
            <strong className="font-medium">Production</strong> (и при необходимости Preview) и выполните новый деплой — иначе в бандл не попадут
            ключи.
          </span>
        </div>
      ) : null}
      {isSupabaseConfigured() && cloudSyncError ? (
        <div
          role="alert"
          className="flex shrink-0 flex-col gap-3 rounded-[14px] border border-red-500/40 bg-red-950/35 px-4 py-3 text-[13px] leading-relaxed text-red-100/95 shadow-glow sm:flex-row sm:items-center sm:justify-between sm:px-5"
        >
          <div>
            <strong className="font-semibold text-red-50">Облако недоступно.</strong>{' '}
            <span className="text-red-100/90">Данные с сервера не загружены; правки ниже не синхронизированы, пока не восстановится связь.</span>
            <span className="mt-1.5 block font-mono text-[11px] text-red-200/80">{cloudSyncError}</span>
          </div>
          <button
            type="button"
            onClick={() => void refetchContacts()}
            className="shrink-0 rounded-lg border border-red-400/50 bg-red-900/40 px-4 py-2 text-[12px] font-semibold text-red-50 transition-colors hover:bg-red-900/55"
          >
            Повторить загрузку
          </button>
        </div>
      ) : null}
      <WorkspaceHero
        totalRows={rows.length}
        duplicateRowsCount={duplicateRowsCount}
        hasPhoneConflicts={hasPhoneConflicts}
        selectedBulkCount={bulkSelectedIds.size}
        activeRowSummary={activeRowSummary}
        onAddRow={addRow}
        onOpenBulkImport={openBulkImport}
        onChangeAccessKey={onChangeAccessKey}
        onOpenDuplicatesPanel={hasPhoneConflicts ? () => setDupPanelOpen(true) : undefined}
      />

      <Toolbar
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        onClearFilters={clearFilters}
        density={density}
        onDensityChange={setDensity}
        onExportCsv={onExportCsv}
        onImportFile={onImportFile}
      />

      <div className="relative min-h-0 flex-1">
        {pasteBusy ? (
          <div
            className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center rounded-[14px] bg-canvas/55 backdrop-blur-[6px] transition-opacity duration-ui animate-fade-in"
            aria-busy="true"
            aria-live="polite"
          >
            <span className="surface-card px-6 py-3 text-[13px] font-semibold text-ink shadow-glow">
              Обработка вставки…
            </span>
          </div>
        ) : null}
        <ContactsTable
          ref={tableRef}
          visibleRows={visibleRows}
          duplicateRowIds={duplicateInfo.duplicateRowIds}
          selectedId={selectedId}
          bulkSelectedIds={bulkSelectedIds}
          density={density}
          onSelectRow={setSelectedId}
          onToggleBulk={toggleBulk}
          onToggleAllVisible={toggleAllVisible}
          onUpdate={updateCell}
          onDeleteRow={deleteRowById}
          onDeleteOthersInDuplicateGroup={(id) => deleteOthersInGroup(id)}
          onBulkPaste={onBulkPasteFromCell}
          onCopyRow={onCopyRow}
          onPasteAnchorRecord={onPasteAnchorRecord}
          citySuggestions={citySuggestions}
          sortKey={sort.key}
          sortDir={sort.dir}
          onSort={handleSort}
        />
      </div>

      <TableStatusBar
        totalRows={rows.length}
        visibleRows={visibleRows.length}
        duplicateRows={duplicateRowsCount}
        duplicateGroups={duplicateInfo.duplicateGroupCount}
        selectedBulkCount={bulkSelectedIds.size}
        activeRowSummary={activeRowSummary}
        filter={filter}
        searchActive={search.trim().length > 0}
        onBulkDelete={bulkDelete}
        canBulkDelete={bulkSelectedIds.size > 0}
      />

      {pasteModal ? (
        <PastePreviewModal
          open
          onClose={() => setPasteModal(null)}
          grid={pasteModal.grid}
          delimiter={pasteModal.delimiter}
          reason={pasteModal.reason}
          initialStartCol={pasteModal.startCol}
          onConfirm={(grid, startCol) => {
            const rowId = pasteModal.rowId;
            setPasteModal(null);
            setPasteBusy(true);
            window.requestAnimationFrame(() => {
              applyGridAndToast(rowId, startCol, grid);
              window.requestAnimationFrame(() => setPasteBusy(false));
            });
          }}
        />
      ) : null}

      {bulkImportOpen && bulkImportSnapshot ? (
        <BulkImportModal
          open
          onClose={() => {
            setBulkImportOpen(false);
            setBulkImportSnapshot(null);
          }}
          onApply={handleBulkImportApply}
          startRowId={bulkImportSnapshot.rowId}
        />
      ) : null}

      <DuplicatePanel
        open={dupPanelOpen}
        onClose={() => setDupPanelOpen(false)}
        groups={duplicateInfo.groups}
        selectedId={selectedId}
        onJumpToRow={jumpToDuplicateRow}
        onDeleteOthersInGroup={deleteOthersInGroup}
        onGoToNextDuplicate={goToNextDuplicate}
      />
    </div>
  );
}
