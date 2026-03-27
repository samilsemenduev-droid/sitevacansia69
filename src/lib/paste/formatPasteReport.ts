import type { PasteApplyMode, PasteApplyStats } from '../../types/paste';

export function formatPasteReport(
  stats: PasteApplyStats,
  dupRows: number,
  dropped: number,
  extra?: { mode?: PasteApplyMode },
): string {
  const lines: string[] = [
    `✔ Добавлено: ${stats.rowsCreated} строк`,
    `✔ Заполнено: ${stats.cellsWritten} ячеек`,
  ];
  if (stats.rowsTouched > 0 || stats.rowsUpdatedExisting > 0) {
    lines.push(
      `✔ Затронуто строк: ${stats.rowsTouched} · обновлено существующих: ${stats.rowsUpdatedExisting}`,
    );
  }
  if (stats.prefilteredAllEmptyRows != null && stats.prefilteredAllEmptyRows > 0) {
    lines.push(`⚠ Пропущено полностью пустых строк: ${stats.prefilteredAllEmptyRows}`);
  }
  if (stats.emptySourceRowsSkipped > 0) {
    lines.push(`⚠ Пропущено пустых строк буфера: ${stats.emptySourceRowsSkipped}`);
  }
  if (dropped > 0) {
    lines.push(`⚠ Не влезло: ${dropped} знач.`);
  }
  if (extra?.mode === 'fillEmpty') {
    lines.push('ℹ Режим: заполнялись только пустые ячейки');
  }
  lines.push(`⚠ Дублей по номеру: ${dupRows}`);
  return lines.join('\n');
}
