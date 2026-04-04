export type AuthSession = {
  token: string;
  userId: string;
  name: string;
  email: string;
  createdAt: string;
};

const AUTH_STORAGE_KEY = 'sathi.auth.session.v1';

export const auth = {
  getSession(): AuthSession | null {
    if (typeof window === 'undefined') return null;

    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as AuthSession;
      if (!parsed?.email || !parsed?.name) return null;
      return parsed;
    } catch {
      return null;
    }
  },

  signIn(name: string, email: string): AuthSession {
    const userId = String(email || '').toLowerCase();
    const session: AuthSession = {
      token: '',
      userId,
      name: String(name || '').trim() || 'Family Member',
      email: String(email || '').trim().toLowerCase(),
      createdAt: new Date().toISOString()
    };

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    }

    return session;
  },

  setSession(payload: { token: string; user: { id: string; name: string; email: string } }): AuthSession {
    const session: AuthSession = {
      token: String(payload.token || '').trim(),
      userId: String(payload.user?.id || ''),
      name: String(payload.user?.name || '').trim() || 'Family Member',
      email: String(payload.user?.email || '').trim().toLowerCase(),
      createdAt: new Date().toISOString()
    };

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    }

    return session;
  },

  getToken(): string {
    return this.getSession()?.token || '';
  },

  signOut(): void {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  },

  isAuthenticated(): boolean {
    const session = this.getSession();
    return Boolean(session?.token && session?.userId);
  }
};
