'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User, UserRole } from '@/lib/types';
import { verifyPassword, hashPassword, generateSessionToken } from '@/lib/security/password';
import { writeAuditEntry } from '@/lib/security/audit-log';

const MOCK_USERS: User[] = [
  { id: '1', name: 'Admin Usuario', email: 'admin@eps.co', role: 'admin' },
  { id: '2', name: 'Ana Analyst', email: 'analyst@eps.co', role: 'analyst' },
  { id: '3', name: 'Victor Viewer', email: 'viewer@eps.co', role: 'viewer' },
];

const USERS_STORE_KEY = 'nota-tecnica-user-credentials';
const SESSION_STORAGE_KEY = 'nota-tecnica-session';
const SESSION_EXPIRY_MS = 8 * 60 * 60 * 1000; // 8 hours

interface StoredCredential {
  email: string;
  passwordHash: string;
}

interface SessionData {
  token: string;
  userId: string;
  expiresAt: string;
}

async function initializeCredentials(): Promise<void> {
  if (typeof window === 'undefined') return;
  const existing = localStorage.getItem(USERS_STORE_KEY);
  if (existing) return;

  const defaults: Record<string, string> = {
    'admin@eps.co': 'admin123',
    'analyst@eps.co': 'analyst123',
    'viewer@eps.co': 'viewer123',
  };

  const credentials: StoredCredential[] = [];
  for (const [email, password] of Object.entries(defaults)) {
    const passwordHash = await hashPassword(password);
    credentials.push({ email, passwordHash });
  }
  localStorage.setItem(USERS_STORE_KEY, JSON.stringify(credentials));
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasPermission: (requiredRole: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeCredentials().then(() => {
      const sessionStr = localStorage.getItem(SESSION_STORAGE_KEY);
      if (sessionStr) {
        try {
          const session: SessionData = JSON.parse(sessionStr);
          if (new Date(session.expiresAt) > new Date()) {
            const foundUser = MOCK_USERS.find(u => u.id === session.userId);
            if (foundUser) {
              setUser(foundUser);
            } else {
              localStorage.removeItem(SESSION_STORAGE_KEY);
            }
          } else {
            localStorage.removeItem(SESSION_STORAGE_KEY);
          }
        } catch {
          localStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
      setIsLoading(false);
    });
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const credStr = localStorage.getItem(USERS_STORE_KEY);
    if (!credStr) {
      return { success: false, error: 'auth.loginError' };
    }

    let credentials: StoredCredential[];
    try {
      credentials = JSON.parse(credStr);
    } catch {
      return { success: false, error: 'auth.loginError' };
    }
    const cred = credentials.find(c => c.email.toLowerCase() === email.toLowerCase());

    if (!cred) {
      writeAuditEntry('AUTH_FAILED_LOGIN', 'user', `Failed login attempt for ${email}`, 'anonymous', email, 'none');
      return { success: false, error: 'auth.loginError' };
    }

    const valid = await verifyPassword(password, cred.passwordHash);
    if (!valid) {
      writeAuditEntry('AUTH_FAILED_LOGIN', 'user', `Failed login attempt for ${email}`, 'anonymous', email, 'none');
      return { success: false, error: 'auth.loginError' };
    }

    const foundUser = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!foundUser) {
      return { success: false, error: 'auth.loginError' };
    }

    const token = generateSessionToken();
    const session: SessionData = {
      token,
      userId: foundUser.id,
      expiresAt: new Date(Date.now() + SESSION_EXPIRY_MS).toISOString(),
    };

    setUser(foundUser);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));

    writeAuditEntry('AUTH_LOGIN', 'user', `User ${foundUser.name} logged in`, foundUser.id, foundUser.name, foundUser.role);

    return { success: true };
  }, []);

  const logout = useCallback(() => {
    if (user) {
      writeAuditEntry('AUTH_LOGOUT', 'user', `User ${user.name} logged out`, user.id, user.name, user.role);
    }
    setUser(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem('nota-tecnica-rips');
    localStorage.removeItem('nota-tecnica-population');
    localStorage.removeItem('nota-tecnica-rips-legal');
    localStorage.removeItem('nota-tecnica-tarifarios');
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      try {
        const sessionStr = localStorage.getItem(SESSION_STORAGE_KEY);
        if (!sessionStr) { logout(); return; }
        const session: SessionData = JSON.parse(sessionStr);
        if (new Date(session.expiresAt) <= new Date()) { logout(); }
      } catch { logout(); }
    }, 60_000);
    return () => clearInterval(interval);
  }, [user, logout]);

  const hasPermission = useCallback((requiredRole: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (user.role === 'admin') return true;
    return roles.includes(user.role);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
