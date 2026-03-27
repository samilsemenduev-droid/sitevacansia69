import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

export type ToastInput = {
  title: string;
  body?: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastItem = ToastInput & { id: string };

type ToastContextValue = {
  push: (t: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function toastStyles(v: ToastVariant): string {
  switch (v) {
    case 'success':
      return 'border-success/25 bg-elevated/95 text-ink shadow-glow ring-1 ring-success/15';
    case 'error':
      return 'border-danger/30 bg-[color-mix(in_oklab,var(--color-card)_88%,var(--color-danger)_12%)] text-red-50 shadow-card ring-1 ring-danger/20';
    default:
      return 'border-line/40 bg-card/95 text-ink shadow-card ring-1 ring-white/[0.04]';
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((t: ToastInput) => {
    const id = crypto.randomUUID();
    const duration = t.durationMs ?? 5200;
    setItems((s) => [...s, { ...t, id, variant: t.variant ?? 'info' }]);
    window.setTimeout(() => {
      setItems((s) => s.filter((x) => x.id !== id));
    }, duration);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[200] flex max-w-sm flex-col gap-2.5 p-1 sm:bottom-5 sm:right-6"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto rounded-[12px] border px-4 py-3.5 text-sm backdrop-blur-xl transition duration-ui ease-out motion-safe:animate-toast-in ${toastStyles(t.variant ?? 'info')}`}
          >
            <div className="font-semibold leading-snug tracking-tight">{t.title}</div>
            {t.body ? (
              <div className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-ink-muted">
                {t.body}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast: оберните приложение в ToastProvider');
  return ctx;
}
