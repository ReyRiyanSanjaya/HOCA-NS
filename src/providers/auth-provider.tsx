"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

// ── Credentials (no database — hardcoded) ─────────────────────────────────
const ADMIN_CREDENTIALS = {
  username: "reyriyansanjaya",
  password: "Simpledark67",
  displayName: "Rey Riyan Sanjaya",
  role: "admin" as const,
};

// ── Types ──────────────────────────────────────────────────────────────────
export interface AdminUser {
  username: string;
  displayName: string;
  role: "admin";
  loginAt: string;
}

interface AuthContextType {
  admin: AdminUser | null;
  isAdmin: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  admin: null,
  isAdmin: false,
  login: () => false,
  logout: () => {},
});

const SESSION_KEY = "axis-admin-session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);

  // Restore from sessionStorage on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) setAdmin(JSON.parse(raw) as AdminUser);
    } catch {
      // ignore
    }
  }, []);

  const login = useCallback((username: string, password: string): boolean => {
    const usernameMatch = username.trim().toLowerCase() === ADMIN_CREDENTIALS.username.toLowerCase();
    const passwordMatch = password === ADMIN_CREDENTIALS.password;
    if (usernameMatch && passwordMatch) {
      const user: AdminUser = {
        username: ADMIN_CREDENTIALS.username,
        displayName: ADMIN_CREDENTIALS.displayName,
        role: "admin",
        loginAt: new Date().toISOString(),
      };
      setAdmin(user);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setAdmin(null);
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ admin, isAdmin: !!admin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
