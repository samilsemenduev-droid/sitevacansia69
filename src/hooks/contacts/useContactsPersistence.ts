import { useEffect, useRef } from 'react';
import type { ContactRow } from '../../types/contact';
import { isSupabaseConfigured } from '../../lib/supabase/client';
import { defaultPersistence, flushContactsPersistence } from '../../storage/persistence';

/**
 * Локальный режим: debounced запись в localStorage + IndexedDB и flush при уходе со страницы.
 * В облачном режиме (валидный Supabase в бандле) не пишем контакты в браузер — источник правды только БД.
 */
export function useContactsPersistence(rows: ContactRow[], hydrated: boolean) {
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  useEffect(() => {
    if (!hydrated) return;
    if (isSupabaseConfigured()) return;
    const t = window.setTimeout(() => void defaultPersistence.save(rows), 450);
    return () => window.clearTimeout(t);
  }, [rows, hydrated]);

  useEffect(() => {
    if (isSupabaseConfigured()) return;
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
