import type { ContactRow } from '../types/contact';

export function contactRowsDataEqual(a: ContactRow, b: ContactRow): boolean {
  return (
    a.phone === b.phone &&
    a.fullName === b.fullName &&
    a.city === b.city &&
    a.user === b.user &&
    a.comment === b.comment &&
    a.owner === b.owner
  );
}

/** Удаления, вставки и обновления между двумя снимками массива строк (по `id`). */
export function partitionContactsDelta(prev: ContactRow[], next: ContactRow[]): {
  toDelete: string[];
  toUpsert: ContactRow[];
} {
  const prevMap = new Map(prev.map((r) => [r.id, r]));
  const nextMap = new Map(next.map((r) => [r.id, r]));

  const toDelete: string[] = [];
  for (const id of prevMap.keys()) {
    if (!nextMap.has(id)) toDelete.push(id);
  }

  const toUpsert: ContactRow[] = [];
  for (const row of nextMap.values()) {
    const p = prevMap.get(row.id);
    if (!p) toUpsert.push(row);
    else if (!contactRowsDataEqual(p, row)) toUpsert.push(row);
  }

  return { toDelete, toUpsert };
}

export function insertRowSortedByCreatedAt(prev: ContactRow[], row: ContactRow): ContactRow[] {
  const t = row.createdAt;
  if (!t) return [...prev, row];
  const i = prev.findIndex((r) => (r.createdAt ?? '\uffff') > t);
  if (i === -1) return [...prev, row];
  return [...prev.slice(0, i), row, ...prev.slice(i)];
}
