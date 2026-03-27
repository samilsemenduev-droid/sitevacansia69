import { useCallback, useState } from 'react';
import { isValidAccessKey, normalizeAccessKeyInput } from '../../config/accessKeys';
import { persistAccess } from '../../lib/auth/accessStorage';

type LoginGateProps = {
  onGranted: () => void;
};

export function LoginGate({ onGranted }: LoginGateProps) {
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = useCallback(() => {
    setError(null);
    const key = normalizeAccessKeyInput(code);
    if (!key) {
      setError('Введите код');
      return;
    }
    if (!isValidAccessKey(key)) {
      setError('Неверный код');
      return;
    }
    setBusy(true);
    try {
      persistAccess(username, key);
      onGranted();
    } finally {
      setBusy(false);
    }
  }, [onGranted, username, code]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-canvas px-4 py-8">
      <div className="surface-card w-full max-w-sm px-6 py-7">
        <h1 className="text-center text-lg font-semibold tracking-tight text-ink">Вход</h1>
        <div className="mt-5 space-y-3">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wide text-ink-muted" htmlFor="login-username">
              Ник
            </label>
            <input
              id="login-username"
              type="text"
              autoComplete="username"
              spellCheck={false}
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              className="input-crm mt-1 w-full py-2.5 text-[14px]"
              placeholder=""
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wide text-ink-muted" htmlFor="login-code">
              Секретный код
            </label>
            <input
              id="login-code"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              className="input-crm mt-1 w-full py-2.5 font-mono text-[13px] tracking-wide"
              placeholder=""
            />
          </div>
        </div>
        {error ? <p className="mt-3 text-[13px] font-medium text-danger">{error}</p> : null}
        <button
          type="button"
          disabled={busy}
          onClick={submit}
          className="btn-primary mt-5 w-full py-2.5 text-[14px] disabled:opacity-50"
        >
          {busy ? '…' : 'Войти'}
        </button>
      </div>
    </div>
  );
}
