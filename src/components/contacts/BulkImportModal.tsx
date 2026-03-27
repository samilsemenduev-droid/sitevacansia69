import { useCallback, useEffect, useMemo, useState } from 'react';
import { COLUMN_LABELS, COLUMN_ORDER, type DataColumnKey } from '../../constants/tableColumns';
import { readStoredUserName } from '../../lib/auth/accessStorage';
import {
  BULK_IMPORT_FIELD_KEYS,
  buildGridFromColumnInputs,
  columnLinesToTextarea,
  mergeGlobalOwnerIntoGrid,
  parseSmartClipboardToColumns,
  type ColumnTextInputs,
} from '../../lib/bulkImport/columnBulkImport';
import type { PasteApplyMode } from '../../types/paste';
import { useToast } from '../system/ToastProvider';

const PREVIEW_ROWS = 8;

const emptyInputs = (): ColumnTextInputs => ({
  phone: '',
  fullName: '',
  city: '',
  user: '',
  comment: '',
  owner: '',
});

type BulkImportModalProps = {
  open: boolean;
  onClose: () => void;
  onApply: (args: {
    grid: string[][];
    startRowId: string;
    startColIndex: number;
    mode: PasteApplyMode;
    prefilteredAllEmptyRows: number;
  }) => void;
  startRowId: string;
};

export function BulkImportModal({ open, onClose, onApply, startRowId }: BulkImportModalProps) {
  const toast = useToast();
  const [texts, setTexts] = useState<ColumnTextInputs>(emptyInputs);
  const [mode, setMode] = useState<PasteApplyMode>('replace');
  const [focusedField, setFocusedField] = useState<DataColumnKey>('phone');

  const sessionOwner = useMemo(() => readStoredUserName(), [open]);

  const preview = useMemo(() => buildGridFromColumnInputs(texts), [texts]);
  const previewWithOwner = useMemo(
    () => mergeGlobalOwnerIntoGrid(preview.grid, sessionOwner),
    [preview.grid, sessionOwner],
  );

  useEffect(() => {
    if (!open) return;
    setTexts(emptyInputs());
    setMode('replace');
    setFocusedField('phone');
  }, [open]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const readClipboard = useCallback(async (): Promise<string | null> => {
    try {
      return await navigator.clipboard.readText();
    } catch {
      toast.push({
        variant: 'error',
        title: 'Буфер недоступен',
        body: 'Разрешите доступ к буферу обмена в браузере.',
      });
      return null;
    }
  }, [toast]);

  const pasteIntoField = useCallback(
    async (key: DataColumnKey) => {
      const t = await readClipboard();
      if (t === null) return;
      setTexts((s) => ({ ...s, [key]: t }));
      toast.push({ variant: 'success', title: 'Вставлено', body: COLUMN_LABELS[key] });
    },
    [readClipboard, toast],
  );

  const smartPaste = useCallback(async () => {
    const t = await readClipboard();
    if (t === null) return;
    const parsed = parseSmartClipboardToColumns(t, focusedField);
    if (parsed.kind === 'single') {
      const target = BULK_IMPORT_FIELD_KEYS.includes(parsed.target) ? parsed.target : 'phone';
      if (target !== parsed.target) setFocusedField('phone');
      setTexts((s) => ({
        ...s,
        [target]: columnLinesToTextarea(parsed.lines),
      }));
      toast.push({
        variant: 'success',
        title: 'Вставка',
        body: parsed.lines.length === 0 ? 'Пусто' : `Строк: ${parsed.lines.length}`,
      });
    } else {
      setTexts((s) => {
        const next = { ...s };
        for (const k of BULK_IMPORT_FIELD_KEYS) {
          if (parsed.columns[k] !== undefined) next[k] = parsed.columns[k] ?? '';
        }
        return next;
      });
      toast.push({ variant: 'success', title: 'Таблица из буфера', body: 'Готово' });
    }
  }, [focusedField, readClipboard, toast]);

  const handleApply = useCallback(() => {
    if (preview.grid.length === 0) {
      toast.push({
        variant: 'error',
        title: 'Нечего вставлять',
        body: 'Заполните хотя бы одну строку.',
      });
      return;
    }
    onApply({
      grid: preview.grid,
      startRowId,
      startColIndex: 0,
      mode,
      prefilteredAllEmptyRows: preview.skippedAllEmptyRows,
    });
  }, [mode, onApply, preview.grid, preview.skippedAllEmptyRows, startRowId, toast]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[160] flex items-center justify-center bg-canvas/80 p-2 backdrop-blur-md animate-fade-in sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-import-title"
    >
      <div className="surface-card flex max-h-[min(94dvh,880px)] w-full max-w-5xl flex-col overflow-hidden shadow-glow">
        <div className="border-b border-line/40 px-3 py-2.5 sm:px-4 sm:py-3">
          <h2 id="bulk-import-title" className="text-base font-semibold tracking-tight text-ink">
            Массовый импорт
          </h2>
          <p className="mt-0.5 text-[12px] text-ink-muted">Каждая строка = одна запись</p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line/30 bg-input/20 px-2 py-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Режим</span>
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="radio"
                name="paste-mode"
                className="h-3.5 w-3.5 shrink-0 accent-[var(--color-accent)]"
                checked={mode === 'replace'}
                onChange={() => setMode('replace')}
              />
              <span className="text-[12px] text-ink">Заменять</span>
            </label>
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="radio"
                name="paste-mode"
                className="h-3.5 w-3.5 shrink-0 accent-[var(--color-accent)]"
                checked={mode === 'fillEmpty'}
                onChange={() => setMode('fillEmpty')}
              />
              <span className="text-[12px] text-ink">Только пустые</span>
            </label>
            <button type="button" className="btn-secondary ml-auto py-1.5 text-[11px]" onClick={() => void smartPaste()}>
              Из буфера
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
            {BULK_IMPORT_FIELD_KEYS.map((key) => (
              <div key={key} className="flex min-h-0 flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[12px] font-semibold text-ink" htmlFor={`bulk-${key}`}>
                    {COLUMN_LABELS[key]}
                  </label>
                  <button type="button" className="btn-ghost py-0.5 text-[10px]" onClick={() => void pasteIntoField(key)}>
                    Буфер
                  </button>
                </div>
                <textarea
                  id={`bulk-${key}`}
                  value={texts[key]}
                  onChange={(e) => setTexts((s) => ({ ...s, [key]: e.target.value }))}
                  onFocus={() => setFocusedField(key)}
                  rows={4}
                  className="input-crm min-h-[5.5rem] flex-1 resize-y font-mono text-[11px] leading-snug"
                  placeholder="По строке на запись"
                  spellCheck={false}
                />
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-line/25 bg-elevated/15 px-2.5 py-2">
            <p className="text-[12px] text-ink">
              Строк: <strong className="tabular-nums text-accent-hover">{preview.rowCount}</strong>
              {preview.skippedAllEmptyRows > 0 ? (
                <span className="text-ink-muted">
                  {' '}
                  · пропущено пустых: <strong className="tabular-nums">{preview.skippedAllEmptyRows}</strong>
                </span>
              ) : null}
            </p>

            {preview.grid.length > 0 ? (
              <div className="mt-2 overflow-x-auto rounded-md border border-line/20 bg-canvas/35">
                <table className="w-full min-w-[640px] border-collapse text-left text-[10px]">
                  <thead>
                    <tr className="border-b border-line/35 bg-card/80 text-[9px] font-semibold uppercase tracking-wide text-ink-muted">
                      <th className="px-1.5 py-1">#</th>
                      {COLUMN_ORDER.map((k) => (
                        <th key={k} className="px-1.5 py-1">
                          {COLUMN_LABELS[k]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewWithOwner.slice(0, PREVIEW_ROWS).map((row, ri) => (
                      <tr key={ri} className="border-b border-line/15 hover:bg-white/[0.03]">
                        <td className="px-1.5 py-1 font-mono text-ink-muted">{ri + 1}</td>
                        {COLUMN_ORDER.map((colKey, ci) => (
                          <td key={colKey} className="max-w-[9rem] truncate px-1.5 py-1 text-ink" title={row[ci] ?? ''}>
                            {row[ci] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.grid.length > PREVIEW_ROWS ? (
                  <p className="border-t border-line/20 px-2 py-1 text-[10px] text-ink-muted">
                    … ещё {preview.grid.length - PREVIEW_ROWS}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line/40 px-3 py-2 sm:px-4">
          <button type="button" className="btn-ghost px-3 py-1.5 text-[13px]" onClick={handleClose}>
            Отмена
          </button>
          <button type="button" className="btn-primary px-5 py-2 text-[13px]" onClick={handleApply}>
            Применить
          </button>
        </div>
      </div>
    </div>
  );
}
