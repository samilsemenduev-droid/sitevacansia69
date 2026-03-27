import type { ContactRow } from '../types/contact';

const STORAGE_KEY = 'contacts-table-data-v1';

export type StoredPayload = {
  version: 1;
  rows: ContactRow[];
  /** Время последнего сохранения (для выбора актуальной копии между LS и IndexedDB). */
  savedAt?: number;
};

export function sanitizeContactRows(raw: unknown): ContactRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (r): r is ContactRow =>
        !!r &&
        typeof r === 'object' &&
        typeof (r as ContactRow).id === 'string' &&
        typeof (r as ContactRow).phone === 'string' &&
        typeof (r as ContactRow).fullName === 'string' &&
        typeof (r as ContactRow).city === 'string' &&
        typeof (r as ContactRow).user === 'string' &&
        typeof (r as ContactRow).comment === 'string',
    )
    .map((r) => ({
      ...r,
      owner: typeof r.owner === 'string' ? r.owner : '',
      createdAt: typeof r.createdAt === 'string' ? r.createdAt : undefined,
    }));
}

/** Полный payload из localStorage (для merge с IndexedDB). */
export function loadStoredPayloadFromLocalStorage(): StoredPayload | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as StoredPayload;
    if (data?.version !== 1 || !Array.isArray(data.rows)) return null;
    const rows = sanitizeContactRows(data.rows);
    return {
      version: 1,
      rows,
      savedAt: typeof data.savedAt === 'number' ? data.savedAt : undefined,
    };
  } catch {
    return null;
  }
}

export function loadContacts(): ContactRow[] | null {
  const p = loadStoredPayloadFromLocalStorage();
  if (!p) return null;
  return p.rows;
}

export function saveContacts(rows: ContactRow[], savedAt: number = Date.now()): void {
  const payload: StoredPayload = { version: 1, rows, savedAt };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* квота или приватный режим */
  }
}
