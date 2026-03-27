import { useRef } from 'react';
import type { RowFilter } from '../../utils/rowQuery';
import type { TableDensity } from '../../types/contact';

export type ToolbarProps = {
  search: string;
  onSearchChange: (v: string) => void;
  filter: RowFilter;
  onFilterChange: (v: RowFilter) => void;
  onClearFilters: () => void;
  density: TableDensity;
  onDensityChange: (d: TableDensity) => void;
  onExportCsv?: () => void;
  onImportFile?: (file: File) => void;
};

export function Toolbar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  onClearFilters,
  density,
  onDensityChange,
  onExportCsv,
  onImportFile,
}: ToolbarProps) {
  const importRef = useRef<HTMLInputElement>(null);
  const hasFilters = search.trim().length > 0 || filter !== 'all';

  return (
    <div className="surface-card shrink-0 px-4 py-3 sm:px-5 sm:py-3.5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-ink-muted" aria-hidden>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Поиск: телефон, имя, город, юзер, комментарий, чей…"
              className="input-crm h-10 w-full pl-10 pr-3"
              aria-label="Поиск"
            />
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
            <label className="sr-only" htmlFor="contacts-filter">
              Фильтр строк
            </label>
            <select
              id="contacts-filter"
              value={filter}
              onChange={(e) => onFilterChange(e.target.value as RowFilter)}
              className="input-crm h-10 min-w-[12.5rem] flex-1 sm:flex-initial"
            >
              <option value="all">Все строки</option>
              <option value="duplicates">Только дубли по номеру</option>
              <option value="unique">Без дублей по номеру</option>
              <option value="emptyPhone">Пустой номер</option>
              <option value="filledPhone">Заполненный номер</option>
            </select>

            <div className="segmented shrink-0">
              <button
                type="button"
                data-active={density === 'compact'}
                onClick={() => onDensityChange('compact')}
              >
                Компакт
              </button>
              <button
                type="button"
                data-active={density === 'comfortable'}
                onClick={() => onDensityChange('comfortable')}
              >
                Стандарт
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <span
            className="help-chip hidden max-w-[min(100%,28rem)] sm:inline-flex"
            title="Alt + вставка — всегда в одну ячейку, без таблицы"
          >
            <svg className="h-3.5 w-3.5 shrink-0 text-accent-hover opacity-90" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0v3H8a1 1 0 100 2h3v3a1 1 0 102 0v-3h3a1 1 0 100-2h-3V6z"
                clipRule="evenodd"
              />
            </svg>
            <span className="truncate">
              До 6 колонок из буфера · <span className="text-ink/80">Alt+V — только в ячейку</span>
            </span>
          </span>
          {onExportCsv ? (
            <button type="button" onClick={onExportCsv} className="btn-secondary h-10 px-3 text-[12px]">
              Экспорт CSV
            </button>
          ) : null}
          {onImportFile ? (
            <>
              <input
                ref={importRef}
                type="file"
                accept=".csv,.tsv,.txt,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                aria-hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) onImportFile(f);
                }}
              />
              <button
                type="button"
                onClick={() => importRef.current?.click()}
                className="btn-ghost h-10 px-3 text-[12px]"
              >
                Импорт…
              </button>
            </>
          ) : null}
          {hasFilters ? (
            <button type="button" onClick={onClearFilters} className="btn-ghost h-10 px-3">
              Сбросить фильтры
            </button>
          ) : null}
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-snug text-ink-muted sm:hidden">
        <span className="font-medium text-ink/85">Вставка:</span> до 6 колонок (таб / строки). Удерживайте Alt при
        вставке, чтобы не разбивать на таблицу.
      </p>
    </div>
  );
}
