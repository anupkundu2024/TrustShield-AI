import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router';
import {
  AccountError,
  accountErrorMessage,
  authApi,
} from '../services/authApi';
import type { LoginInput, RegisterInput, User } from '../types/auth';
import { AuthContext } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessionEnded, setSessionEnded] = useState(false);
  const revision = useRef(0);

  const refreshUser = useCallback(async () => {
    const current = ++revision.current;
    setLoading(true);
    setError('');
    try {
      const verifiedUser = await authApi.me();
      if (current === revision.current) {
        setUser(verifiedUser);
        setSessionEnded(false);
      }
    } catch (failure) {
      if (current !== revision.current) return;
      setUser(null);
      if (failure instanceof AccountError && failure.status === 401) {
        setSessionEnded((ended) => ended || !!user);
      } else setError(accountErrorMessage(failure));
    } finally {
      if (current === revision.current) setLoading(false);
    }
  }, [user]);

  // Initialization is independent of later updates to the user state.
  useEffect(() => {
    let active = true;
    authApi
      .me()
      .then((verifiedUser) => {
        if (active) setUser(verifiedUser);
      })
      .catch((failure: unknown) => {
        if (
          active &&
          !(failure instanceof AccountError && failure.status === 401)
        ) {
          setError(accountErrorMessage(failure));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function setAuthenticated(verifiedUser: User) {
    revision.current++;
    setUser(verifiedUser);
    setError('');
    setSessionEnded(false);
    setLoading(false);
  }

  async function login(input: LoginInput) {
    setAuthenticated(await authApi.login(input));
  }

  async function register(input: RegisterInput) {
    setAuthenticated(await authApi.register(input));
  }

  async function logout() {
    await authApi.logout();
    revision.current++;
    startTransition(() => {
      navigate('/', { replace: true });
      setUser(null);
      setError('');
      setSessionEnded(false);
      setLoading(false);
    });
  }

  async function updateName(fullName: string) {
    const current = revision.current;
    try {
      const updated = await authApi.updateName(fullName);
      if (current === revision.current) setUser(updated);
    } catch (failure) {
      if (
        current === revision.current &&
        failure instanceof AccountError &&
        failure.status === 401
      ) {
        setUser(null);
        setSessionEnded(true);
      }
      throw failure;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        sessionEnded,
        login,
        register,
        logout,
        refreshUser,
        updateName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
