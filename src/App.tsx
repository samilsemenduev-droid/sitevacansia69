import { useCallback, useEffect, useState } from 'react';
import { LoginGate } from './components/auth/LoginGate';
import { ContactsWorkspace } from './components/contacts/ContactsWorkspace';
import { clearAccess, readStoredAccess } from './lib/auth/accessStorage';

export function App() {
  const [granted, setGranted] = useState<boolean | null>(null);

  useEffect(() => {
    setGranted(readStoredAccess());
  }, []);

  const handleGranted = useCallback(() => setGranted(true), []);

  const handleChangeKey = useCallback(() => {
    clearAccess();
    setGranted(false);
  }, []);

  if (granted === null) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-canvas text-sm text-ink-muted">
        Проверка доступа…
      </div>
    );
  }

  if (!granted) {
    return <LoginGate onGranted={handleGranted} />;
  }

  return <ContactsWorkspace onChangeAccessKey={handleChangeKey} />;
}
