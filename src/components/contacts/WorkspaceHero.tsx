type WorkspaceHeroProps = {
  totalRows: number;
  duplicateRowsCount: number;
  hasPhoneConflicts: boolean;
  selectedBulkCount: number;
  /** Краткая подпись активной строки (якорь вставки), не путать с чекбоксами. */
  activeRowSummary: string | null;
  onAddRow: () => void;
  /** Открыть массовый импорт столбиками. */
  onOpenBulkImport: () => void;
  onChangeAccessKey: () => void;
  /** Открыть панель дублей (если есть конфликты). */
  onOpenDuplicatesPanel?: () => void;
};

export function WorkspaceHero({
  totalRows,
  duplicateRowsCount,
  hasPhoneConflicts,
  selectedBulkCount,
  activeRowSummary,
  onAddRow,
  onOpenBulkImport,
  onChangeAccessKey,
  onOpenDuplicatesPanel,
}: WorkspaceHeroProps) {
  return (
    <header className="surface-hero shrink-0 px-5 py-5 sm:px-7 sm:py-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Контакты</h1>
            <span className="rounded-md bg-accent-muted px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider text-accent-hover">
              Workspace
            </span>
          </div>
          <p className="max-w-2xl text-[13px] leading-relaxed text-ink-muted sm:text-sm">
            Массовая вставка, поиск дублей по номеру и удобная ручная работа в одной таблице.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {hasPhoneConflicts && onOpenDuplicatesPanel ? (
              <button
                type="button"
                onClick={onOpenDuplicatesPanel}
                className={`chip-metric cursor-pointer transition-transform duration-ui hover:scale-[1.02] ${
                  hasPhoneConflicts
                    ? 'border-danger/25 bg-[rgb(239_68_68_/0.08)] text-red-200/90'
                    : ''
                }`}
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    hasPhoneConflicts
                      ? 'bg-danger shadow-[0_0_8px_rgb(239_68_68_/0.65)]'
                      : 'bg-success shadow-[0_0_8px_rgb(34_197_94_/0.45)]'
                  }`}
                  aria-hidden
                />
                Дублей: <strong className="text-red-100">{duplicateRowsCount}</strong>
                <span className="ml-1 text-2xs font-medium text-ink-muted">· панель</span>
              </button>
            ) : (
              <span
                className={`chip-metric ${
                  hasPhoneConflicts
                    ? 'border-danger/25 bg-[rgb(239_68_68_/0.08)] text-red-200/90'
                    : ''
                }`}
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    hasPhoneConflicts
                      ? 'bg-danger shadow-[0_0_8px_rgb(239_68_68_/0.65)]'
                      : 'bg-success shadow-[0_0_8px_rgb(34_197_94_/0.45)]'
                  }`}
                  aria-hidden
                />
                {hasPhoneConflicts ? (
                  <>
                    Дублей: <strong className="text-red-100">{duplicateRowsCount}</strong>
                  </>
                ) : (
                  <>Дублей нет</>
                )}
              </span>
            )}
            <span className="chip-metric">
              Строк: <strong>{totalRows}</strong>
            </span>
            <span className="chip-metric" title="Только строки с отмеченным чекбоксом">
              Выделено чекбоксами: <strong>{selectedBulkCount}</strong>
            </span>
            {activeRowSummary ? (
              <span
                className="chip-metric max-w-[min(100%,22rem)] border-accent/20 bg-accent-muted/50"
                title="Активная строка задаёт якорь для «Вставить данные» и вставки из буфера"
              >
                <span className="truncate">{activeRowSummary}</span>
              </span>
            ) : (
              <span className="chip-metric border-line/40 bg-input/30 text-ink-muted">
                Нет активной строки — кликните по строке для якоря вставки
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
          <button type="button" onClick={onAddRow} className="btn-secondary min-h-[44px] min-w-[160px] sm:min-w-0">
            Добавить строку
          </button>
          <button
            type="button"
            onClick={onOpenBulkImport}
            className="btn-primary min-h-[44px] min-w-[180px] sm:min-w-0"
          >
            Вставить данные
          </button>
          <button type="button" onClick={onChangeAccessKey} className="btn-ghost min-h-[40px] text-[12px] sm:min-w-0">
            Сменить ключ
          </button>
        </div>
      </div>
    </header>
  );
}
