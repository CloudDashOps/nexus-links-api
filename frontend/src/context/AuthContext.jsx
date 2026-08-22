import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import api from "@/api/client";

const AuthContext = createContext(null);

const TOKEN_KEY = "nexuslinks_token";
const USER_KEY = "nexuslinks_user";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || "null");
    } catch {
      return null;
    }
  });

  const login = useCallback((newToken, newUser) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    if (newUser) localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    else localStorage.removeItem(USER_KEY);
    setToken(newToken);
    setUser(newUser ?? null);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // Fetch the profile when we hold a token but no cached user
  useEffect(() => {
    let cancelled = false;
    if (token && !user) {
      api
        .get("/auth/users/me")
        .then((res) => {
          if (!cancelled) login(token, res.data);
        })
        .catch(() => {
          if (!cancelled) logout();
        });
    }
    return () => {
      cancelled = true;
    };
  }, [token, user, login, logout]);

  const value = useMemo(
    () => ({ token, user, isAuthenticated: Boolean(token), login, logout }),
    [token, user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}