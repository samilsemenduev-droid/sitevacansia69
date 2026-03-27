import type { DataColumnKey } from '../constants/tableColumns';
import { getSupabase } from '../lib/supabase/client';
import type { ContactRow } from '../types/contact';
import { partitionContactsDelta } from '../utils/contactRowDiff';

export type DbContactRow = {
  id: string;
  phone: string;
  full_name: string;
  city: string;
  user: string;
  comment: string;
  owner: string;
  created_at: string;
  updated_at: string;
};

const TABLE = 'contacts';

function logRepoError(op: string, err: unknown): void {
  console.error(`[contactsRepository] ${op}`, err);
}

const FIELD_TO_DB: Record<DataColumnKey, keyof Omit<DbContactRow, 'id' | 'created_at' | 'updated_at'>> = {
  phone: 'phone',
  fullName: 'full_name',
  city: 'city',
  user: 'user',
  comment: 'comment',
  owner: 'owner',
};

export function dbRowToContact(db: DbContactRow): ContactRow {
  return {
    id: db.id,
    phone: db.phone ?? '',
    fullName: db.full_name ?? '',
    city: db.city ?? '',
    user: db.user ?? '',
    comment: db.comment ?? '',
    owner: db.owner ?? '',
    createdAt: db.created_at,
  };
}

export function contactToDbInsert(r: ContactRow): Omit<DbContactRow, 'created_at' | 'updated_at'> {
  return {
    id: r.id,
    phone: r.phone,
    full_name: r.fullName,
    city: r.city,
    user: r.user,
    comment: r.comment,
    owner: r.owner,
  };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function fetchAllContacts(): Promise<ContactRow[]> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase не настроен');
  const { data, error } = await sb.from(TABLE).select('*').order('created_at', { ascending: true });
  if (error) {
    logRepoError('fetchAllContacts', error);
    throw error;
  }
  return (data as DbContactRow[]).map(dbRowToContact);
}

export async function insertContact(row: ContactRow): Promise<ContactRow> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase не настроен');
  const payload = contactToDbInsert(row);
  const { data, error } = await sb.from(TABLE).insert(payload).select('*').single();
  if (error) {
    logRepoError('insertContact', error);
    throw error;
  }
  return dbRowToContact(data as DbContactRow);
}

export async function updateContactField(id: string, field: DataColumnKey, value: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase не настроен');
  const col = FIELD_TO_DB[field];
  const { error } = await sb.from(TABLE).update({ [col]: value }).eq('id', id);
  if (error) {
    logRepoError(`updateContactField(${field})`, error);
    throw error;
  }
}

export async function deleteContactIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase не настроен');
  for (const part of chunk(ids, 200)) {
    const { error } = await sb.from(TABLE).delete().in('id', part);
    if (error) throw error;
  }
}

export async function upsertContacts(rows: ContactRow[]): Promise<void> {
  if (rows.length === 0) return;
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase не настроен');
  const payloads = rows.map((r) => contactToDbInsert(r));
  for (const part of chunk(payloads, 200)) {
    const { error } = await sb.from(TABLE).upsert(part, { onConflict: 'id' });
    if (error) {
      logRepoError('upsertContacts', error);
      throw error;
    }
  }
}

export async function syncContactsDelta(prev: ContactRow[], next: ContactRow[]): Promise<void> {
  const { toDelete, toUpsert } = partitionContactsDelta(prev, next);
  await deleteContactIds(toDelete);
  await upsertContacts(toUpsert);
}
