import { useMemo } from 'react';
import type { ContactRow, SortKey } from '../../types/contact';
import { findDuplicatePhones } from '../../utils/findDuplicatePhones';
import {
  rowMatchesFilter,
  rowMatchesSearch,
  sortContactRows,
  type RowFilter,
} from '../../utils/rowQuery';

type SortState = { key: SortKey | null; dir: 'asc' | 'desc' };

export function useContactsDerived(
  rows: ContactRow[],
  search: string,
  filter: RowFilter,
  sort: SortState,
) {
  const duplicateInfo = useMemo(() => findDuplicatePhones(rows), [rows]);

  const visibleRows = useMemo(() => {
    const dup = duplicateInfo.duplicateRowIds;
    const filtered = rows.filter(
      (row) => rowMatchesSearch(row, search) && rowMatchesFilter(row, filter, dup),
    );
    return sortContactRows(filtered, sort.key, sort.dir);
  }, [rows, search, filter, sort.key, sort.dir, duplicateInfo.duplicateRowIds]);

  const citySuggestions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const c = r.city.trim();
      if (c.length > 0) set.add(c);
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'ru'));
  }, [rows]);

  return { duplicateInfo, visibleRows, citySuggestions };
}
