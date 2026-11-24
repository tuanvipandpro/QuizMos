import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';

// All sign-in entry points share the same dialog state and error handling.
export function useSignIn({ onSuccess, onStart, onSettled } = {}) {
  const { signInWithGoogle } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const mounted = useRef(false);
  const pending = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const close = () => {
    setOpen(false);
    setError(null);
  };
  const submit = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    let attempt, account;
    try {
      attempt = onStart?.();
      const result = await signInWithGoogle();
      if (!mounted.current) return;
      if (result.success) {
        account = result.user;
        close();
        onSuccess?.(account);
      } else setError('Could not sign in. Please retry.');
    } catch {
      if (mounted.current) setError('Could not sign in. Please retry.');
    } finally {
      pending.current = false;
      if (mounted.current) {
        onSettled?.(attempt, account);
        setBusy(false);
      }
    }
  };
  return {
    show: () => {
      setError(null);
      setOpen(true);
    },
    modalProps: { open, busy, error, onClose: close, onSignIn: submit },
  };
}
