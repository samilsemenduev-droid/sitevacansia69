/**
 * Ключи доступа (только frontend). Формат: XXXX-XXXX-XXXX, uppercase + цифры.
 *
 * ВАЖНО (безопасность): любой, кто видит бандл или этот файл, может обойти «вход».
 * Это слабый барьер уровня «общая ссылка + код», не замена серверной авторизации.
 * Ключ Supabase `anon` в VITE_* тоже публичен в клиенте — защита данных должна быть в RLS + Auth,
 * а не в секрете во фронте.
 */
export const ACCESS_KEYS = [
  'A9F2-XK93-LM21',
  'B3H7-QP41-ZW88',
  'C5M9-RT62-YU44',
  'D2K8-VN73-XS55',
  'E7J4-LS94-WT66',
  'F1N6-MX05-UR77',
  'G8P3-KY16-TQ88',
  'H4R9-JZ27-SP99',
  'J6S2-HW38-RO00',
  'K0T5-GV49-QP11',
  'L9U8-FU50-ON22',
  'M3V1-ET61-NM33',
  'N7W4-DS72-ML44',
  'P2X9-CR83-LK55',
  'Q5Y3-BQ94-KJ66',
  'R8Z6-AP05-JI77',
  'S1A0-ZO16-IH88',
  'T4B7-YN27-HG99',
  'U6C2-XM38-GF00',
  'V0D5-WL49-FE11',
  'W9E8-VK50-ED22',
  'X3F1-UJ61-DC33',
  'Y7G4-TI72-CB44',
  'Z2H9-SH83-BA55',
  'A1J4-RG94-AZ66',
  'B5K7-QF05-BY77',
  'C8L0-PE16-CX88',
  'D2M3-OD27-DW99',
  'E6N6-NC38-EV00',
  'F0O9-MB49-FU11',
] as const;

export const ACCESS_KEY_SET = new Set<string>(ACCESS_KEYS as readonly string[]);

export function normalizeAccessKeyInput(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidAccessKey(raw: string): boolean {
  return ACCESS_KEY_SET.has(normalizeAccessKeyInput(raw));
}
