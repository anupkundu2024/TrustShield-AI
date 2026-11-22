import { createContext, useContext } from 'react';
import type { LoginInput, RegisterInput, User } from '../types/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string;
  sessionEnded: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateName: (fullName: string) => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const state = useContext(AuthContext);
  if (!state) throw new Error('AuthProvider is missing.');
  return state;
}
