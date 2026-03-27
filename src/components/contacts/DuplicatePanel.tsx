import type { PhoneDuplicateGroup } from '../../types/duplicates';

type DuplicatePanelProps = {
  open: boolean;
  onClose: () => void;
  groups: PhoneDuplicateGroup[];
  selectedId: string | null;
  onJumpToRow: (rowId: string) => void;
  onDeleteOthersInGroup: (keepRowId: string) => void;
  onGoToNextDuplicate: () => void;
};

export function DuplicatePanel({
  open,
  onClose,
  groups,
  selectedId,
  onJumpToRow,
  onDeleteOthersInGroup,
  onGoToNextDuplicate,
}: DuplicatePanelProps) {
  if (!open) return null;

  const selectedGroup = groups.find((g) => selectedId && g.rowIds.includes(selectedId));

  return (
    <>
      <button
        type="button"
        aria-label="Закрыть панель дублей"
        className="fixed inset-0 z-[120] bg-canvas/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <aside className="fixed right-0 top-0 z-[130] flex h-full w-full max-w-md flex-col border-l border-line/50 bg-card shadow-float motion-safe:animate-menu-in">
        <div className="border-b border-line/40 bg-elevated/50 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-ink">Дубли по номеру</h2>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
                Группы с одинаковым нормализованным номером. Удаление — только по вашему действию.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-ink-muted transition-colors duration-ui hover:bg-white/[0.06] hover:text-ink"
              aria-label="Закрыть"
            >
              ✕
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onGoToNextDuplicate}
              disabled={groups.length === 0}
              className="btn-primary py-2 text-[12px] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Следующий конфликт
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {groups.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-success/30 bg-success-muted px-4 py-8 text-center text-[13px] text-ink">
              Конфликтов по номерам нет.
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {groups.map((g, gi) => {
                const isSelIn = selectedId ? g.rowIds.includes(selectedId) : false;
                return (
                  <li
                    key={g.normalizedKey + gi}
                    className={`rounded-[10px] border px-3 py-3 transition-colors duration-ui ${
                      isSelIn
                        ? 'border-accent/35 bg-accent-muted shadow-[inset_0_0_0_1px_rgb(109_124_255_/0.2)]'
                        : 'border-line/40 bg-input/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[13px] font-semibold text-ink">
                          {g.displayPhone || g.normalizedKey}
                        </p>
                        <p className="mt-0.5 text-[11px] text-ink-muted">
                          Ключ: <span className="font-mono text-ink/80">{g.normalizedKey}</span>
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-danger-muted px-2 py-0.5 text-[11px] font-bold text-red-200/95">
                        ×{g.rowIds.length}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onJumpToRow(g.rowIds[0])}
                        className="btn-secondary py-1.5 text-[11px]"
                      >
                        К первой строке
                      </button>
                      {selectedId && g.rowIds.includes(selectedId) ? (
                        <button
                          type="button"
                          onClick={() => onDeleteOthersInGroup(selectedId)}
                          className="btn-danger-soft py-1.5 text-[11px]"
                        >
                          Удалить остальные в группе
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {selectedGroup && selectedId ? (
          <div className="border-t border-line/40 bg-elevated/30 px-4 py-3 text-[11px] leading-relaxed text-ink-muted">
            <p>
              Выбранная строка — <span className="font-semibold text-ink">основная</span> для действия «Удалить
              остальные в группе».
            </p>
          </div>
        ) : null}
      </aside>
    </>
  );
}
