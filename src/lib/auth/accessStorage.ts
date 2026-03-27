import { isValidAccessKey, normalizeAccessKeyInput } from '../../config/accessKeys';

export const LS_ACCESS_GRANTED = 'access_granted';
export const LS_ACCESS_KEY = 'access_key';
export const LS_USER_NAME = 'user_name';

export function readStoredUserName(): string {
  try {
    const raw = localStorage.getItem(LS_USER_NAME);
    return raw?.replace(/\u00a0/g, ' ').trim() ?? '';
  } catch {
    return '';
  }
}

export function readStoredAccess(): boolean {
  try {
    if (localStorage.getItem(LS_ACCESS_GRANTED) !== 'true') return false;
    const key = localStorage.getItem(LS_ACCESS_KEY);
    if (!key) return false;
    return isValidAccessKey(key);
  } catch {
    return false;
  }
}

export function persistAccess(userName: string, key: string): void {
  const name = userName.replace(/\u00a0/g, ' ').trim();
  const normalized = normalizeAccessKeyInput(key);
  localStorage.setItem(LS_USER_NAME, name);
  localStorage.setItem(LS_ACCESS_GRANTED, 'true');
  localStorage.setItem(LS_ACCESS_KEY, normalized);
}

export function clearAccess(): void {
  try {
    localStorage.removeItem(LS_ACCESS_GRANTED);
    localStorage.removeItem(LS_ACCESS_KEY);
    localStorage.removeItem(LS_USER_NAME);
  } catch {
    /* private mode */
  }
}
