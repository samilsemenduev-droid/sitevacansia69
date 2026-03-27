import { useVirtualizer } from '@tanstack/react-virtual';
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  type CSSProperties,
} from 'react';
import type { ContactRow, SortDir, SortKey, TableDensity } from '../../types/contact';
import { COLUMN_LABELS, COLUMN_ORDER, type DataColumnKey } from '../../constants/tableColumns';
import { ContactTableRow } from './ContactTableRow';

const SELECT_COL_PX = 52;
const ACTIONS_COL_PX = 76;

function SortHeader({
  label,
  colKey,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  colKey: SortKey;
  sortKey: SortKey | null;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const active = sortKey === colKey;
  return (
    <button
      type="button"
      onClick={() => onSort(colKey)}
      className="group flex w-full items-center gap-1.5 rounded-md px-1.5 py-2 text-left transition-colors duration-ui ease-out hover:bg-white/[0.04]"
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted group-hover:text-ink/90">
        {label}
      </span>
      <span
        className={`text-[10px] font-bold tabular-nums transition-opacity duration-ui ease-out ${
          active ? 'text-accent-hover opacity-100' : 'text-accent opacity-0 group-hover:opacity-40'
        }`}
        aria-hidden
      >
        {active ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </button>
  );
}

export type ContactsTableHandle = {
  scrollToRowId: (id: string) => void;
};

type ContactsTableProps = {
  visibleRows: ContactRow[];
  duplicateRowIds: Set<string>;
  selectedId: string | null;
  bulkSelectedIds: Set<string>;
  density: TableDensity;
  onSelectRow: (id: string) => void;
  onToggleBulk: (id: string, checked: boolean) => void;
  onToggleAllVisible: (checked: boolean) => void;
  onUpdate: (id: string, field: (typeof COLUMN_ORDER)[number], value: string) => void;
  onDeleteRow: (id: string) => void;
  onDeleteOthersInDuplicateGroup: (keepRowId: string) => void;
  onBulkPaste: (rowId: string, field: DataColumnKey, text: string) => void;
  onCopyRow: (row: ContactRow) => void;
  onPasteAnchorRecord?: (rowId: string, field: (typeof COLUMN_ORDER)[number]) => void;
  citySuggestions: string[];
  sortKey: SortKey | null;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
};

export const ContactsTable = forwardRef<ContactsTableHandle, ContactsTableProps>(
  function ContactsTable(
    {
      visibleRows,
      duplicateRowIds,
      selectedId,
      bulkSelectedIds,
      density,
      onSelectRow,
      onToggleBulk,
      onToggleAllVisible,
      onUpdate,
      onDeleteRow,
      onDeleteOthersInDuplicateGroup,
      onBulkPaste,
      onCopyRow,
      onPasteAnchorRecord,
      citySuggestions,
      sortKey,
      sortDir,
      onSort,
    },
    ref,
  ) {
    const parentRef = useRef<HTMLDivElement>(null);
    const cityListId = 'city-suggestions-datalist';

    const gridStyle: CSSProperties = useMemo(
      () => ({
        display: 'grid',
        gridTemplateColumns: `${SELECT_COL_PX}px minmax(10rem, 1fr) minmax(11rem, 1.45fr) minmax(6.5rem, 0.82fr) minmax(6.5rem, 0.82fr) minmax(8.5rem, 1fr) minmax(6.25rem, 0.72fr) ${ACTIONS_COL_PX}px`,
        alignItems: 'stretch',
        columnGap: 0,
      }),
      [],
    );

    const cellPad = density === 'compact' ? 'px-2 py-1' : 'px-2.5 py-1.5';
    const minCell = density === 'compact' ? 'min-h-[2.75rem]' : 'min-h-[3.35rem]';

    const virtualizer = useVirtualizer({
      count: visibleRows.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => (density === 'compact' ? 48 : 62),
      overscan: 24,
      measureElement: (el) => el.getBoundingClientRect().height,
    });

    useImperativeHandle(
      ref,
      () => ({
        scrollToRowId: (id: string) => {
          const index = visibleRows.findIndex((r) => r.id === id);
          if (index >= 0) virtualizer.scrollToIndex(index, { align: 'center' });
        },
      }),
      [visibleRows, virtualizer],
    );

    const allVisibleSelected =
      visibleRows.length > 0 && visibleRows.every((r) => bulkSelectedIds.has(r.id));
    const someVisibleSelected = visibleRows.some((r) => bulkSelectedIds.has(r.id));

    const headerCheckboxRef = useCallback(
      (el: HTMLInputElement | null) => {
        if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected;
      },
      [someVisibleSelected, allVisibleSelected],
    );

    const headerStickyClass =
      'bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/88';

    return (
      <section className="surface-card flex h-full min-h-0 flex-col overflow-hidden">
        <datalist id={cityListId}>
          {citySuggestions.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-1 sm:p-1.5">
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[10px] bg-input/40">
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-canvas/90 to-transparent"
              aria-hidden
            />
            <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-color:rgb(36_50_74)_transparent] [scrollbar-width:thin]">
              <div
                className="flex h-full min-h-[420px] min-w-[78rem] flex-col"
                style={{ minHeight: 'min(70vh, 100%)' }}
              >
                <div
                  className={`sticky top-0 z-30 border-b border-line/50 ${headerStickyClass} shadow-[0_1px_0_rgb(0_0_0/0.25)]`}
                  style={gridStyle}
                >
                  <div
                    className={`sticky left-0 z-40 flex flex-col items-center justify-center gap-0.5 border-r border-line/25 shadow-[8px_0_24px_-12px_rgb(0_0_0/0.65)] ${headerStickyClass} px-1`}
                  >
                    <input
                      ref={headerCheckboxRef}
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(e) => onToggleAllVisible(e.target.checked)}
                      className="crm-checkbox"
                      aria-label="Выбрать все видимые строки"
                    />
                    <span className="text-2xs font-medium tabular-nums text-ink-muted/70">#</span>
                  </div>
                  <div
                    className={`sticky z-40 flex items-center border-r border-line/25 shadow-[6px_0_20px_-10px_rgb(0_0_0/0.5)] ${headerStickyClass}`}
                    style={{ left: SELECT_COL_PX }}
                  >
                    <div className="min-w-0 flex-1 pr-1">
                      <SortHeader
                        label={COLUMN_LABELS.phone}
                        colKey="phone"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={onSort}
                      />
                    </div>
                  </div>
                  <div className="flex items-center px-0.5">
                    <SortHeader
                      label={COLUMN_LABELS.fullName}
                      colKey="fullName"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={onSort}
                    />
                  </div>
                  <div className="flex items-center px-0.5">
                    <SortHeader
                      label={COLUMN_LABELS.city}
                      colKey="city"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={onSort}
                    />
                  </div>
                  <div className="flex items-center px-0.5">
                    <SortHeader
                      label={COLUMN_LABELS.user}
                      colKey="user"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={onSort}
                    />
                  </div>
                  <div className="flex items-center px-0.5">
                    <SortHeader
                      label={COLUMN_LABELS.comment}
                      colKey="comment"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={onSort}
                    />
                  </div>
                  <div className="flex items-center px-0.5">
                    <SortHeader
                      label={COLUMN_LABELS.owner}
                      colKey="owner"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={onSort}
                    />
                  </div>
                  <div
                    className={`sticky right-0 z-40 flex items-center justify-center border-l border-line/25 shadow-[-8px_0_24px_-12px_rgb(0_0_0/0.65)] ${headerStickyClass}`}
                  >
                    <span className="sr-only">Действия со строкой</span>
                    <svg
                      className="h-4 w-4 text-ink-muted/45"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden
                    >
                      <path d="M6 10a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm5.5 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm4 1.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                    </svg>
                  </div>
                </div>

                <div
                  ref={parentRef}
                  className="table-scroll-fade min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth bg-gradient-to-b from-transparent via-canvas/[0.12] to-canvas/[0.35]"
                  role="region"
                  aria-label="Таблица контактов"
                >
                  {visibleRows.length === 0 ? (
                    <div className="flex min-h-[min(50vh,420px)] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
                      <div className="surface-card max-w-md border-dashed border-line/60 bg-elevated/30 px-8 py-10 shadow-none">
                        <p className="text-sm font-semibold text-ink">Нет строк по фильтру</p>
                        <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
                          Сбросьте фильтры или добавьте строки — можно вставить до шести колонок из буфера за раз.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="relative w-full pb-6"
                      style={{ height: `${virtualizer.getTotalSize()}px` }}
                    >
                      {virtualizer.getVirtualItems().map((vi) => {
                        const row = visibleRows[vi.index];
                        if (!row) return null;
                        return (
                          <div
                            key={row.id}
                            ref={virtualizer.measureElement}
                            data-index={vi.index}
                            className="absolute left-0 top-0 w-full motion-safe:animate-row-in"
                            style={{ transform: `translateY(${vi.start}px)` }}
                          >
                            <ContactTableRow
                              row={row}
                              visibleIndex={vi.index}
                              duplicateRowIds={duplicateRowIds}
                              selectedId={selectedId}
                              bulkSelected={bulkSelectedIds.has(row.id)}
                              density={density}
                              onSelectRow={onSelectRow}
                              onToggleBulk={onToggleBulk}
                              onUpdate={onUpdate}
                              onBulkPaste={onBulkPaste}
                              onDeleteRow={onDeleteRow}
                              onDeleteOthersInDuplicateGroup={onDeleteOthersInDuplicateGroup}
                              onCopyRow={onCopyRow}
                              onPasteAnchorRecord={onPasteAnchorRecord}
                              cityListId={cityListId}
                              gridStyle={gridStyle}
                              cellPad={cellPad}
                              minCell={minCell}
                              selectColPx={SELECT_COL_PX}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  },
);
