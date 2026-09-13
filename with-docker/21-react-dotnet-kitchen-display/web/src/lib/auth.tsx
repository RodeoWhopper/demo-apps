import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ApiError, request, type RequestOptions } from "./api";
import type { AuthResponse, Role, User } from "./types";

type Status = "loading" | "anon" | "authed";

interface AuthContextValue {
  status: Status;
  user: User | null;
  login(email: string, password: string): Promise<User>;
  logout(): Promise<void>;
  /** Fetch with the in-memory access token; refreshes it once transparently on a 401. */
  authFetch<T>(path: string, opts?: RequestOptions): Promise<T>;
  hasRole(...roles: Role[]): boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const REFRESH_LEEWAY_MS = 60_000;

/**
 * The access token only ever lives in memory (a ref, never storage). The httpOnly `kds_refresh`
 * cookie is what survives reloads: on mount we call POST /api/auth/refresh to restore the session,
 * and a timer refreshes again one minute before the access token expires.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<User | null>(null);
  const tokenRef = useRef<string | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const inflight = useRef<Promise<string | null> | null>(null);
  const refreshRef = useRef<() => Promise<string | null>>(async () => null);

  const clearTimer = () => {
    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  };

  const applySession = useCallback((auth: AuthResponse | null) => {
    clearTimer();
    if (!auth) {
      tokenRef.current = null;
      setUser(null);
      setStatus("anon");
      return;
    }
    tokenRef.current = auth.accessToken;
    setUser(auth.user);
    setStatus("authed");
    const delay = Math.max(new Date(auth.expiresAt).getTime() - Date.now() - REFRESH_LEEWAY_MS, 5_000);
    timerRef.current = window.setTimeout(() => void refreshRef.current(), delay);
  }, []);

  const refresh = useCallback((): Promise<string | null> => {
    if (inflight.current) return inflight.current;
    inflight.current = (async () => {
      try {
        const auth = await request<AuthResponse>("/api/auth/refresh", { method: "POST" });
        applySession(auth);
        return auth.accessToken;
      } catch {
        applySession(null);
        return null;
      } finally {
        inflight.current = null;
      }
    })();
    return inflight.current;
  }, [applySession]);
  refreshRef.current = refresh;

  useEffect(() => {
    void refresh();
    return clearTimer;
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const auth = await request<AuthResponse>("/api/auth/login", { json: { email, password } });
      applySession(auth);
      return auth.user;
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await request<void>("/api/auth/logout", { method: "POST" });
    } catch {
      /* cookie may already be gone */
    }
    applySession(null);
  }, [applySession]);

  const authFetch = useCallback(
    async <T,>(path: string, opts: RequestOptions = {}): Promise<T> => {
      const token = tokenRef.current ?? (await refresh());
      if (!token) throw new ApiError(401, { title: "Not signed in", status: 401 });
      try {
        return await request<T>(path, { ...opts, token });
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          const fresh = await refresh();
          if (fresh) return request<T>(path, { ...opts, token: fresh });
        }
        throw e;
      }
    },
    [refresh],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      login,
      logout,
      authFetch,
      hasRole: (...roles) => user !== null && roles.includes(user.role),
    }),
    [status, user, login, logout, authFetch],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
