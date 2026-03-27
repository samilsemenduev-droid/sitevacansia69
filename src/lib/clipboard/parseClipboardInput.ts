import type { ClipboardParseResult } from '../../types/paste';
import { detectClipboardShape, resolvePastePreview } from './detectClipboardShape';

/**
 * Разбор буфера + решение, нужен ли предпросмотр (с учётом колонки-якоря).
 */
export function parseClipboardInput(text: string, startColIndex = 0): ClipboardParseResult {
  const detection = detectClipboardShape(text);
  const { needsPreview, reason } = resolvePastePreview(detection, startColIndex);
  return {
    grid: detection.grid,
    delimiter: detection.delimiter,
    needsPreview,
    reason: reason ?? detection.reason,
  };
}

export { detectClipboardShape, describeDelimiter, resolvePastePreview, splitSeparatedLine } from './detectClipboardShape';
