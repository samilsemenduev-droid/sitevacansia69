import { useEffect, useRef } from 'react';
import type { ContactRow } from '../../types/contact';
import { defaultPersistence, flushContactsPersistence } from '../../storage/persistence';

/**
 * Вторичный кэш: debounced запись в localStorage + IndexedDB и flush при уходе со страницы.
 * При включённом Supabase источником правды остаётся база; этот слой — офлайн-копия и быстрый резерв.
 */
export function useContactsPersistence(rows: ContactRow[], hydrated: boolean) {
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  useEffect(() => {
    if (!hydrated) return;
    const t = window.setTimeout(() => void defaultPersistence.save(rows), 450);
    return () => window.clearTimeout(t);
  }, [rows, hydrated]);

  useEffect(() => {
    const flush = () => {
      void flushContactsPersistence(rowsRef.current);
    };
    window.addEventListener('beforeunload', flush);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') void flushContactsPersistence(rowsRef.current);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
}
