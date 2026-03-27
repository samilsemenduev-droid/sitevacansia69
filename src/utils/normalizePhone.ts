/**
 * Нормализация номера для сравнения дублей (не для отображения).
 *
 * 1) Удаляются все нецифровые символы: +, пробелы, скобки, тире, точки и т.д.
 * 2) Российские номера приводятся к единому ключу:
 *    - 11 цифр, начинается с 8 → 7 + остаток
 *    - 11 цифр, начинается с 7 → без изменений
 *    - 10 цифр → 7 + эти 10 цифр (локальный формат РФ)
 * 3) Прочие международные номера сравниваются по полной последовательности цифр.
 */
export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return '';

  if (digits.length === 11 && digits[0] === '8') {
    return `7${digits.slice(1)}`;
  }

  if (digits.length === 11 && digits[0] === '7') {
    return digits;
  }

  if (digits.length === 10) {
    return `7${digits}`;
  }

  return digits;
}
