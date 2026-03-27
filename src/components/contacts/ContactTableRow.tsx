import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type CSSProperties,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import type { ContactRow, TableDensity } from '../../types/contact';
import type { DataColumnKey } from '../../constants/tableColumns';
import { shouldInterceptGridPaste } from '../../lib/paste/shouldInterceptGridPaste';

type EditableField = DataColumnKey;

type ContactTableRowProps = {
  row: ContactRow;
  visibleIndex: number;
  duplicateRowIds: Set<string>;
  selectedId: string | null;
  bulkSelected: boolean;
  density: TableDensity;
  onSelectRow: (id: string) => void;
  onToggleBulk: (id: string, checked: boolean) => void;
  onUpdate: (id: string, field: EditableField, value: string) => void;
  onBulkPaste: (rowId: string, field: EditableField, text: string) => void;
  onDeleteRow: (id: string) => void;
  onDeleteOthersInDuplicateGroup: (keepRowId: string) => void;
  onCopyRow: (row: ContactRow) => void;
  onPasteAnchorRecord?: (rowId: string, field: EditableField) => void;
  cityListId: string;
  gridStyle: CSSProperties;
  cellPad: string;
  minCell: string;
  selectColPx: number;
};

const iconBtn =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-muted outline-none transition-[background-color,color,transform] duration-ui ease-out hover:bg-white/[0.06] hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/35 active:scale-95';

function RowActionsMenu({
  open,
  onClose,
  anchorRef,
  isDup,
  onCopy,
  onDelete,
  onDeleteOthers,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLButtonElement | null>;
  isDup: boolean;
  onCopy: () => void;
  onDelete: () => void;
  onDeleteOthers: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    const menuW = 220;
    const pad = 8;
    const left = Math.min(Math.max(pad, r.right - menuW), window.innerWidth - menuW - pad);
    const top = r.bottom + 6;
    setPos({ top, left });
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      onClose();
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  const itemClass =
    'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] font-medium text-ink transition-colors duration-ui ease-out hover:bg-white/[0.06]';

  return createPortal(
    <div
      ref={menuRef}
      style={{ position: 'fixed', top: pos.top, left: pos.left, width: 220, zIndex: 400 }}
      className="motion-safe:animate-menu-in rounded-[10px] border border-line/50 bg-card/95 py-1 shadow-card backdrop-blur-xl"
      role="menu"
    >
      <button
        type="button"
        role="menuitem"
        className={itemClass}
        onClick={() => {
          onCopy();
          onClose();
        }}
      >
        <svg className="h-4 w-4 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        Копировать строку
      </button>
      {isDup ? (
        <button
          type="button"
          role="menuitem"
          className={`${itemClass} text-red-200/95 hover:bg-danger/12`}
          onClick={() => {
            onDeleteOthers();
            onClose();
          }}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Удалить остальные дубли
        </button>
      ) : null}
      <button
        type="button"
        role="menuitem"
        className={`${itemClass} text-red-200/90 hover:bg-danger/10`}
        onClick={() => {
          onDelete();
          onClose();
        }}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Удалить строку
      </button>
    </div>,
    document.body,
  );
}

export const ContactTableRow = memo(function ContactTableRow({
  row,
  visibleIndex,
  duplicateRowIds,
  selectedId,
  bulkSelected,
  density,
  onSelectRow,
  onToggleBulk,
  onUpdate,
  onBulkPaste,
  onDeleteRow,
  onDeleteOthersInDuplicateGroup,
  onCopyRow,
  onPasteAnchorRecord,
  cityListId,
  gridStyle,
  cellPad,
  minCell,
  selectColPx,
}: ContactTableRowProps) {
  const isDup = duplicateRowIds.has(row.id);
  const isSelected = selectedId === row.id;
  const [menuOpen, setMenuOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>, field: EditableField) => {
      const text = e.clipboardData.getData('text/plain');
      const altKey = Boolean(
        (e.nativeEvent as globalThis.ClipboardEvent & { altKey?: boolean }).altKey,
      );
      if (!text || !shouldInterceptGridPaste(text, altKey)) return;
      e.preventDefault();
      onBulkPaste(row.id, field, text);
    },
    [onBulkPaste, row.id],
  );

  const taRows = density === 'compact' ? 1 : 2;
  const nameRows = density === 'compact' ? 1 : 2;
  const taMin = density === 'compact' ? 'min-h-[2.35rem]' : 'min-h-[3.15rem]';

  const rowSurface = isDup
    ? 'bg-dup-row shadow-[inset_3px_0_0_0_rgb(239_68_68_/0.45)]'
    : isSelected
      ? 'bg-accent-muted/35 shadow-[inset_0_0_0_1px_rgb(109_124_255_/0.25)]'
      : 'bg-white/[0.015] hover:bg-white/[0.035]';

  const onRowMouseDown = useCallback(() => onSelectRow(row.id), [onSelectRow, row.id]);

  const stickyShell = isDup ? 'bg-[var(--sticky-dup)]' : 'bg-card/92';

  return (
    <div
      style={gridStyle}
      className={`group/row border-b border-line/35 transition-[background-color,box-shadow] duration-ui ease-out ${rowSurface} ${
        bulkSelected && !isDup ? 'ring-1 ring-inset ring-accent/25' : ''
      } ${bulkSelected && isDup ? 'ring-1 ring-inset ring-danger/20' : ''}`}
      onMouseDown={onRowMouseDown}
      onFocusCapture={() => onSelectRow(row.id)}
    >
      <div
        className={`sticky left-0 z-20 flex flex-col items-center justify-center gap-0.5 border-r border-line/20 ${stickyShell} backdrop-blur-md ${cellPad} ${minCell}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={bulkSelected}
          onChange={(e) => onToggleBulk(row.id, e.target.checked)}
          className="crm-checkbox"
          aria-label={`Выбрать строку ${visibleIndex + 1}`}
        />
        <span
          className={`text-2xs font-semibold tabular-nums transition-colors duration-ui ease-out ${
            isDup ? 'text-danger/90' : 'text-ink-muted/75'
          }`}
        >
          {visibleIndex + 1}
        </span>
      </div>

      <div
        className={`sticky z-20 border-r border-line/20 ${stickyShell} backdrop-blur-md ${cellPad} ${minCell}`}
        style={{ left: selectColPx }}
      >
        <label className="sr-only" htmlFor={`${row.id}-phone`}>
          Номер телефона
        </label>
        <div className={isDup ? 'rounded-md p-px ring-1 ring-danger/35 shadow-[0_0_20px_-6px_rgb(239_68_68_/0.55)]' : ''}>
          <input
            id={`${row.id}-phone`}
            value={row.phone}
            onChange={(e) => onUpdate(row.id, 'phone', e.target.value)}
            onFocus={() => onPasteAnchorRecord?.(row.id, 'phone')}
            onPaste={(e) => handlePaste(e, 'phone')}
            placeholder="Номер телефона"
            autoComplete="off"
            className={isDup ? 'input-crm-dup py-2' : 'input-crm py-2'}
          />
        </div>
      </div>

      <div className={`${cellPad} ${minCell}`}>
        <label className="sr-only" htmlFor={`${row.id}-name`}>
          Имя и фамилия
        </label>
        <textarea
          id={`${row.id}-name`}
          value={row.fullName}
          onChange={(e) => onUpdate(row.id, 'fullName', e.target.value)}
          onFocus={() => onPasteAnchorRecord?.(row.id, 'fullName')}
          onPaste={(e) => handlePaste(e, 'fullName')}
          placeholder="Имя и фамилия"
          rows={nameRows}
          className={`input-crm resize-y ${taMin} py-2`}
        />
      </div>
      <div className={`${cellPad} ${minCell}`}>
        <label className="sr-only" htmlFor={`${row.id}-city`}>
          Город
        </label>
        <input
          id={`${row.id}-city`}
          value={row.city}
          onChange={(e) => onUpdate(row.id, 'city', e.target.value)}
          onFocus={() => onPasteAnchorRecord?.(row.id, 'city')}
          onPaste={(e) => handlePaste(e, 'city')}
          placeholder="Город"
          list={cityListId}
          autoComplete="off"
          className="input-crm py-2"
        />
      </div>
      <div className={`${cellPad} ${minCell}`}>
        <label className="sr-only" htmlFor={`${row.id}-user`}>
          Юзер
        </label>
        <input
          id={`${row.id}-user`}
          value={row.user}
          onChange={(e) => onUpdate(row.id, 'user', e.target.value)}
          onFocus={() => onPasteAnchorRecord?.(row.id, 'user')}
          onPaste={(e) => handlePaste(e, 'user')}
          placeholder="@username"
          autoComplete="off"
          className="input-crm py-2"
        />
      </div>
      <div className={`${cellPad} ${minCell}`}>
        <label className="sr-only" htmlFor={`${row.id}-comment`}>
          Комментарий
        </label>
        <textarea
          id={`${row.id}-comment`}
          value={row.comment}
          onChange={(e) => onUpdate(row.id, 'comment', e.target.value)}
          onFocus={() => onPasteAnchorRecord?.(row.id, 'comment')}
          onPaste={(e) => handlePaste(e, 'comment')}
          placeholder="Комментарий"
          rows={taRows}
          className={`input-crm resize-y ${taMin} py-2`}
        />
      </div>
      <div className={`${cellPad} ${minCell}`}>
        <span className="sr-only">Чей</span>
        <div
          className={`input-crm flex cursor-default items-center py-2 text-[13px] text-ink/90 ${taMin}`}
          title={row.owner || undefined}
        >
          <span className="truncate">{row.owner || '—'}</span>
        </div>
      </div>

      <div
        className={`sticky right-0 z-20 flex items-center justify-center gap-0.5 border-l border-line/25 ${stickyShell} backdrop-blur-md px-0.5 ${minCell}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={iconBtn}
          title="Копировать строку"
          aria-label="Копировать строку"
          onClick={() => onCopyRow(row)}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </button>
        <button
          ref={moreRef}
          type="button"
          className={iconBtn}
          title="Ещё действия"
          aria-label="Меню действий строки"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
            <path d="M6 10a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm5.5 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm4 1.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
          </svg>
        </button>
        <RowActionsMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          anchorRef={moreRef}
          isDup={isDup}
          onCopy={() => onCopyRow(row)}
          onDelete={() => onDeleteRow(row.id)}
          onDeleteOthers={() => onDeleteOthersInDuplicateGroup(row.id)}
        />
      </div>
    </div>
  );
});
