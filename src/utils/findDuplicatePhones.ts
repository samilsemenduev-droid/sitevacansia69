import type { PhoneDuplicateGroup } from '../types/duplicates';
import type { ContactRow } from '../types/contact';
import { createEmptyRow } from './newRow';
import { normalizePhone } from './normalizePhone';

export type DuplicatePhoneResult = {
  duplicateRowIds: Set<string>;
  duplicateGroupCount: number;
  groups: PhoneDuplicateGroup[];
  /** Быстрый доступ: id строки → индекс группы в `groups`. */
  rowIdToGroupIndex: Map<string, number>;
};

/**
 * Поиск дублей только по колонке телефона по всей таблице.
 * Пустые номера не считаются дублями друг с другом.
 */
export function findDuplicatePhones(rows: ContactRow[]): DuplicatePhoneResult {
  const keyToIds = new Map<string, string[]>();
  const keyToDisplay = new Map<string, string>();

  for (const row of rows) {
    const key = normalizePhone(row.phone);
    if (key === '') continue;

    const list = keyToIds.get(key);
    if (list) list.push(row.id);
    else {
      keyToIds.set(key, [row.id]);
      keyToDisplay.set(key, row.phone.trim() || key);
    }
  }

  const duplicateRowIds = new Set<string>();
  const groups: PhoneDuplicateGroup[] = [];
  const rowIdToGroupIndex = new Map<string, number>();

  for (const [normalizedKey, ids] of keyToIds.entries()) {
    if (ids.length < 2) continue;
    const idx = groups.length;
    groups.push({
      normalizedKey,
      rowIds: [...ids],
      displayPhone: keyToDisplay.get(normalizedKey) ?? normalizedKey,
    });
    for (const id of ids) {
      duplicateRowIds.add(id);
      rowIdToGroupIndex.set(id, idx);
    }
  }

  return {
    duplicateRowIds,
    duplicateGroupCount: groups.length,
    groups,
    rowIdToGroupIndex,
  };
}

export function deleteOtherRowsInDuplicateGroup(
  rows: ContactRow[],
  keepRowId: string,
  groups: PhoneDuplicateGroup[],
): ContactRow[] {
  const group = groups.find((g) => g.rowIds.includes(keepRowId));
  if (!group) return rows;
  if (!rows.some((r) => r.id === keepRowId)) return rows;
  const remove = new Set(group.rowIds.filter((id) => id !== keepRowId));
  const next = rows.filter((r) => !remove.has(r.id));
  return next.length === 0 ? [createEmptyRow()] : next;
}
