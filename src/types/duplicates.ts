export type PhoneDuplicateGroup = {
  /** Нормализованный ключ сравнения. */
  normalizedKey: string;
  rowIds: string[];
  /** Пример отображаемого номера (как в первой строке группы). */
  displayPhone: string;
};
