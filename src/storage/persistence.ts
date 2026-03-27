import type { ContactRow } from '../types/contact';
import { loadStoredPayloadFromLocalStorage, saveContacts, type StoredPayload } from './contactsStorage';
import { loadStoredPayloadFromIndexedDb, saveContactsToIndexedDb } from './indexedDbContacts';

/**
 * Адаптер хранилища: IndexedDB как основной буфер для объёма, localStorage — дубль и fallback.
 * Загрузка: выбирается более свежая копия по `savedAt`; при равных метках (legacy) предпочитается LS —
 * он исторически обновлялся на `beforeunload`, когда IDB мог не успеть.
 */
export type ContactsPersistence = {
  load: () => Promise<ContactRow[] | null>;
  save: (rows: ContactRow[]) => Promise<void>;
};

function pickNewerPayload(idb: StoredPayload | null, ls: StoredPayload | null): ContactRow[] | null {
  if (!idb && !ls) return null;
  if (!idb) return ls!.rows;
  if (!ls) return idb.rows;

  const idbEmpty = idb.rows.length === 0;
  const lsEmpty = ls.rows.length === 0;
  if (idbEmpty && !lsEmpty) return ls.rows;
  if (lsEmpty && !idbEmpty) return idb.rows;
  if (idbEmpty && lsEmpty) return [];

  const idbT = idb.savedAt ?? 0;
  const lsT = ls.savedAt ?? 0;
  if (lsT > idbT) return ls.rows;
  if (idbT > lsT) return idb.rows;
  // Одинаковые метки (в т.ч. обе 0): localStorage чаще отражал последний sync при закрытии вкладки
  if (ls.rows.length > 0) return ls.rows;
  return idb.rows;
}

/** Синхронная запись в LS + асинхронная в IDB с общим `savedAt` (для закрытия вкладки и фона). */
export async function flushContactsPersistence(rows: ContactRow[]): Promise<void> {
  const savedAt = Date.now();
  await saveContactsToIndexedDb(rows, savedAt);
  saveContacts(rows, savedAt);
}

export const defaultPersistence: ContactsPersistence = {
  async load() {
    const [idb, ls] = await Promise.all([
      loadStoredPayloadFromIndexedDb(),
      Promise.resolve(loadStoredPayloadFromLocalStorage()),
    ]);
    const picked = pickNewerPayload(idb, ls);
    return picked;
  },

  async save(rows) {
    await flushContactsPersistence(rows);
  },
};
