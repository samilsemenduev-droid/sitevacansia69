import type { ContactRow, SortDir, SortKey } from '../types/contact';
import { normalizePhone } from './normalizePhone';

export type RowFilter =
  | 'all'
  | 'duplicates'
  | 'unique'
  | 'emptyPhone'
  | 'filledPhone';

export function rowMatchesSearch(row: ContactRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [row.phone, row.fullName, row.city, row.user, row.comment, row.owner].some((v) =>
    v.toLowerCase().includes(q),
  );
}

export function rowMatchesFilter(
  row: ContactRow,
  filter: RowFilter,
  duplicateRowIds: Set<string>,
): boolean {
  const phoneKey = normalizePhone(row.phone);
  const phoneEmpty = phoneKey === '';

  switch (filter) {
    case 'all':
      return true;
    case 'duplicates':
      return duplicateRowIds.has(row.id);
    case 'unique':
      return !duplicateRowIds.has(row.id);
    case 'emptyPhone':
      return phoneEmpty;
    case 'filledPhone':
      return !phoneEmpty;
    default:
      return true;
  }
}

function sortValue(row: ContactRow, key: SortKey): string {
  if (key === 'phone') return normalizePhone(row.phone) || row.phone.toLowerCase();
  return (row[key] ?? '').toLowerCase();
}

export function sortContactRows(
  rows: ContactRow[],
  key: SortKey | null,
  dir: SortDir,
): ContactRow[] {
  if (!key) return rows;
  const m = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = sortValue(a, key);
    const vb = sortValue(b, key);
    if (va < vb) return -1 * m;
    if (va > vb) return 1 * m;
    return 0;
  });
}
