'use client';

import { create } from 'zustand';

type AuthUser = {
  id: string;
  email: string;
  name: string;
  businessName: string;
};

interface AuthState {
  user: AuthUser | null;
  sessionToken: string | null;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  setSessionToken: (token: string | null) => void;
  loginDB: (email: string, password: string) => Promise<void>;
  signupDB: (email: string, password: string, name: string, businessName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const isBrowser = typeof window !== 'undefined';

function saveUser(user: AuthUser | null) {
  if (!isBrowser) return;
  if (user) {
    window.localStorage.setItem('user', JSON.stringify(user));
  } else {
    window.localStorage.removeItem('user');
  }
}

function saveSessionToken(token: string | null) {
  if (!isBrowser) return;
  if (token) {
    window.localStorage.setItem('sessionToken', token);
  } else {
    window.localStorage.removeItem('sessionToken');
  }
}

function createSafeUser(data: Partial<AuthUser> & { id: string; email: string }) {
  return {
    id: data.id,
    email: data.email,
    name: data.name || data.email.split('@')[0],
    businessName: data.businessName || 'My Business',
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  sessionToken: null,
  isLoading: false,
  setUser: (user) => {
    saveUser(user);
    set({ user });
  },
  setSessionToken: (token) => {
    saveSessionToken(token);
    set({ sessionToken: token });
  },
  loginDB: async (email, password) => {
    set({ isLoading: true });

    try {
      const response = await fetch('/api/auth/login-db', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Login failed');
      }

      const user = createSafeUser(data.user || { id: '', email });
      saveUser(user);
      saveSessionToken(data.token ?? null);
      set({ user, sessionToken: data.token ?? null, isLoading: false });
    } catch (error: unknown) {
      set({ isLoading: false });
      throw error instanceof Error ? error : new Error('Login failed');
    }
  },
  signupDB: async (email, password, name, businessName) => {
    set({ isLoading: true });

    try {
      const response = await fetch('/api/auth/signup-db', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name, businessName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Signup failed');
      }

      const user = createSafeUser({
        id: data.user?.id,
        email: data.user?.email || email,
        name,
        businessName,
      });

      saveUser(user);
      saveSessionToken(data.token ?? null);
      set({ user, sessionToken: data.token ?? null, isLoading: false });
    } catch (error: unknown) {
      set({ isLoading: false });
      throw error instanceof Error ? error : new Error('Signup failed');
    }
  },
  logout: async () => {
    set({ isLoading: true });

    try {
      await fetch('/api/auth/logout-db', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch {
      // ignore logout errors
    } finally {
      saveUser(null);
      saveSessionToken(null);
      set({ user: null, sessionToken: null, isLoading: false });
    }
  },
}));

export function hydrateAuthStore() {
  if (!isBrowser) return;

  const storedUser = localStorage.getItem('user');
  const storedSessionToken = localStorage.getItem('sessionToken');
  let user: AuthUser | null = null;

  if (storedUser) {
    try {
      const parsed = JSON.parse(storedUser) as Partial<AuthUser>;
      if (parsed?.id && parsed?.email) {
        user = createSafeUser(parsed as Partial<AuthUser> & { id: string; email: string });
      }
    } catch {
      // ignore invalid stored user data
    }
  }

  useAuthStore.setState({
    user,
    sessionToken: storedSessionToken,
    isLoading: false,
  });
}
