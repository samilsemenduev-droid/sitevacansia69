/** Порядок колонок данных в таблице (без служебных колонок выбора/действий). */
export const COLUMN_ORDER = ['phone', 'fullName', 'city', 'user', 'comment', 'owner'] as const;

export type DataColumnKey = (typeof COLUMN_ORDER)[number];

export const COLUMN_LABELS: Record<DataColumnKey, string> = {
  phone: 'Номер телефона',
  fullName: 'Имя и фамилия',
  city: 'Город',
  user: 'Юзер',
  comment: 'Комментарий',
  owner: 'Чей',
};

export function columnIndex(field: DataColumnKey): number {
  return COLUMN_ORDER.indexOf(field);
}
