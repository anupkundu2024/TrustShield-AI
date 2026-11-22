import { useState } from 'react';
import { useAuth } from '../../contexts/authContext';
import { accountErrorMessage } from '../../services/authApi';

export function useLogout() {
  const { logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function signOut() {
    setBusy(true);
    setError('');
    try {
      await logout();
    } catch (failure) {
      setError(accountErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, signOut };
}
