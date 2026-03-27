export type ContactRow = {
  id: string;
  phone: string;
  fullName: string;
  city: string;
  user: string;
  comment: string;
  /** Кто добавил / чей контакт (ник сотрудника). */
  owner: string;
  /** ISO с сервера (Supabase); для сортировки при realtime. */
  createdAt?: string;
};

export type SortKey = 'phone' | 'fullName' | 'city' | 'user' | 'comment' | 'owner';
export type SortDir = 'asc' | 'desc';

export type ColumnKey = SortKey;

/** Плотность строк таблицы контактов. */
export type TableDensity = 'compact' | 'comfortable';
