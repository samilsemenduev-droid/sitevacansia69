import type { ContactRow } from '../types/contact';

export function createEmptyRow(initial?: { owner?: string }): ContactRow {
  const o = initial?.owner?.replace(/\u00a0/g, ' ').trim() ?? '';
  return {
    id: crypto.randomUUID(),
    phone: '',
    fullName: '',
    city: '',
    user: '',
    comment: '',
    owner: o,
  };
}
