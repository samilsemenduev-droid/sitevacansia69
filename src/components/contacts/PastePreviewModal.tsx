import { useEffect, useMemo, useState } from 'react';
import { COLUMN_LABELS, COLUMN_ORDER, type DataColumnKey } from '../../constants/tableColumns';
import { describeDelimiter } from '../../lib/clipboard/parseClipboardInput';
import type { PasteDelimiter } from '../../types/paste';

type PastePreviewModalProps = {
  open: boolean;
  onClose: () => void;
  grid: string[][];
  delimiter: PasteDelimiter;
  reason?: string;
  /** Индекс колонки данных (0 … COLUMN_ORDER.length − 1), с которой начнётся размещение. */
  initialStartCol: number;
  onConfirm: (grid: string[][], startColIndex: number) => void;
};

const COL_OPTIONS: DataColumnKey[] = [...COLUMN_ORDER];

export function PastePreviewModal({
  open,
  onClose,
  grid,
  delimiter,
  reason,
  initialStartCol,
  onConfirm,
}: PastePreviewModalProps) {
  const [startCol, setStartCol] = useState(initialStartCol);
  const [draft, setDraft] = useState(() => JSON.stringify(grid));

  useEffect(() => {
    if (open) {
      setStartCol(initialStartCol);
      setDraft(JSON.stringify(grid));
    }
  }, [open, initialStartCol, grid]);

  const parsedGrid = useMemo(() => {
    try {
      const g = JSON.parse(draft) as string[][];
      if (!Array.isArray(g)) return grid;
      return g.map((row) => (Array.isArray(row) ? row.map((c) => String(c)) : []));
    } catch {
      return grid;
    }
  }, [draft, grid]);

  const previewRows = parsedGrid.slice(0, 18);
  const maxCols = Math.max(1, ...parsedGrid.map((r) => r.length), COLUMN_ORDER.length);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-canvas/75 p-4 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paste-preview-title"
    >
      <div className="surface-card flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden shadow-glow">
        <div className="border-b border-line/40 bg-elevated/50 px-5 py-4">
          <h2 id="paste-preview-title" className="text-lg font-semibold tracking-tight text-ink">
            Предпросмотр вставки
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
            Разделитель: <span className="font-medium text-ink">{describeDelimiter(delimiter)}</span>
            . Строк в буфере:{' '}
            <span className="tabular-nums font-semibold text-ink">{parsedGrid.length}</span>, колонок
            (макс.):{' '}
            <span className="tabular-nums font-semibold text-ink">{maxCols}</span>.
          </p>
          {reason ? (
            <p className="mt-3 rounded-[10px] border border-accent/25 bg-accent-muted px-3 py-2.5 text-xs leading-relaxed text-ink">
              {reason}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-4 overflow-auto px-5 py-5">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-ink">Начальная колонка таблицы</span>
            <select
              value={startCol}
              onChange={(e) => setStartCol(Number(e.target.value))}
              className="input-crm py-2.5"
            >
              {COL_OPTIONS.map((k, i) => (
                <option key={k} value={i}>
                  {COLUMN_LABELS[k]}
                </option>
              ))}
            </select>
            <span className="text-xs text-ink-muted">
              Данные заполнятся вправо от выбранной колонки и вниз от активной строки.
            </span>
          </label>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-ink">Сетка (JSON, для правки)</span>
              <span className="text-xs text-ink-muted">При ошибке разбора используется исходная сетка</span>
            </div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={5}
              className="input-crm font-mono text-xs leading-relaxed"
              spellCheck={false}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-ink">Первые строки</p>
            <div className="overflow-x-auto rounded-[10px] border border-line/35 bg-input/30">
              <table className="min-w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 bg-elevated/90 text-[10px] font-semibold uppercase tracking-wide text-ink-muted backdrop-blur-md">
                  <tr className="border-b border-line/35">
                    <th className="px-3 py-2.5">#</th>
                    {Array.from({ length: Math.min(maxCols, 8) }, (_, i) => (
                      <th key={i} className="px-3 py-2.5">
                        {i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, ri) => (
                    <tr
                      key={ri}
                      className="border-b border-line/25 transition-colors duration-ui ease-out odd:bg-card/40 even:bg-transparent hover:bg-white/[0.03]"
                    >
                      <td className="px-3 py-2 font-mono text-ink-muted">{ri + 1}</td>
                      {Array.from({ length: Math.min(maxCols, 8) }, (_, ci) => (
                        <td
                          key={ci}
                          className="max-w-[10rem] truncate px-3 py-2 text-ink"
                          title={row[ci] ?? ''}
                        >
                          {row[ci] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line/40 bg-elevated/40 px-5 py-3.5">
          <button type="button" onClick={onClose} className="btn-secondary px-5 py-2 text-sm">
            Отмена
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(parsedGrid, startCol);
              onClose();
            }}
            className="btn-primary px-6 py-2 text-sm"
          >
            Применить вставку
          </button>
        </div>
      </div>
    </div>
  );
}
