import { openDB } from 'idb';
import type { ContactRow } from '../types/contact';
import type { StoredPayload } from './contactsStorage';
import { sanitizeContactRows } from './contactsStorage';

const DB_NAME = 'contacts-table-app-v1';
const STORE = 'meta';
const KEY = 'payload';

function isValidPayload(data: unknown): data is StoredPayload {
  if (!data || typeof data !== 'object') return false;
  const d = data as StoredPayload;
  return d.version === 1 && Array.isArray(d.rows);
}

export async function loadStoredPayloadFromIndexedDb(): Promise<StoredPayload | null> {
  try {
    const db = await openDB(DB_NAME, 1, {
      upgrade(database) {
        database.createObjectStore(STORE);
      },
    });
    const raw = await db.get(STORE, KEY);
    if (!isValidPayload(raw)) return null;
    const rows = sanitizeContactRows(raw.rows);
    return {
      version: 1,
      rows,
      savedAt: typeof raw.savedAt === 'number' ? raw.savedAt : undefined,
    };
  } catch {
    return null;
  }
}

export async function loadContactsFromIndexedDb(): Promise<ContactRow[] | null> {
  const p = await loadStoredPayloadFromIndexedDb();
  if (!p || p.rows.length === 0) return null;
  return p.rows;
}

export async function saveContactsToIndexedDb(rows: ContactRow[], savedAt: number = Date.now()): Promise<void> {
  const payload: StoredPayload = { version: 1, rows, savedAt };
  try {
    const db = await openDB(DB_NAME, 1, {
      upgrade(database) {
        database.createObjectStore(STORE);
      },
    });
    await db.put(STORE, payload, KEY);
  } catch {
    /* приватный режим, квота */
  }
}
