import type { RowFilter } from '../../utils/rowQuery';

type TableStatusBarProps = {
  totalRows: number;
  visibleRows: number;
  duplicateRows: number;
  duplicateGroups: number;
  selectedBulkCount: number;
  /** Активная строка (якорь), дублирует смысл hero для узких экранов. */
  activeRowSummary: string | null;
  filter: RowFilter;
  searchActive: boolean;
  onBulkDelete: () => void;
  canBulkDelete: boolean;
};

export function TableStatusBar({
  totalRows,
  visibleRows,
  duplicateRows,
  duplicateGroups,
  selectedBulkCount,
  activeRowSummary,
  filter,
  searchActive,
  onBulkDelete,
  canBulkDelete,
}: TableStatusBarProps) {
  const filtered = searchActive || filter !== 'all';

  return (
    <footer className="surface-card flex flex-wrap items-center gap-x-1 gap-y-2 px-4 py-2.5 text-[12px] text-ink-muted sm:px-5">
      <span className="inline-flex items-center gap-1.5 rounded-md bg-input/60 px-2.5 py-1">
        <span className="text-ink-muted">Всего</span>
        <strong className="tabular-nums font-semibold text-ink">{totalRows}</strong>
      </span>
      <span className="hidden text-line/80 sm:inline" aria-hidden>
        ·
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-md bg-input/60 px-2.5 py-1">
        <span className="text-ink-muted">Видимо</span>
        <strong className="tabular-nums font-semibold text-ink">{visibleRows}</strong>
        {filtered ? <span className="text-2xs font-medium text-accent-hover/90">фильтр</span> : null}
      </span>
      <span className="hidden text-line/80 sm:inline" aria-hidden>
        ·
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-md bg-input/60 px-2.5 py-1">
        <span className="text-ink-muted">Дубли</span>
        <strong className="tabular-nums font-semibold text-danger/90">{duplicateRows}</strong>
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-md bg-input/60 px-2.5 py-1">
        <span className="text-ink-muted">Группы</span>
        <strong className="tabular-nums font-semibold text-accent-hover/95">{duplicateGroups}</strong>
      </span>
      <span className="hidden text-line/80 sm:inline" aria-hidden>
        ·
      </span>
      <span
        className="inline-flex items-center gap-1.5 rounded-md bg-input/60 px-2.5 py-1"
        title="Только чекбоксы строк"
      >
        <span className="text-ink-muted">Чекбоксы</span>
        <strong className="tabular-nums font-semibold text-ink">{selectedBulkCount}</strong>
      </span>
      {activeRowSummary ? (
        <>
          <span className="hidden text-line/80 lg:inline" aria-hidden>
            ·
          </span>
          <span
            className="hidden max-w-[14rem] truncate rounded-md border border-accent/20 bg-accent-muted/35 px-2.5 py-1 text-[11px] text-ink/90 lg:inline-flex"
            title="Якорь для массовой вставки"
          >
            {activeRowSummary}
          </span>
        </>
      ) : null}
      {canBulkDelete ? (
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:ml-auto sm:w-auto">
          <button type="button" onClick={onBulkDelete} className="btn-danger-soft py-1.5 text-[11px]">
            Удалить выделенные
          </button>
        </div>
      ) : null}
    </footer>
  );
}
