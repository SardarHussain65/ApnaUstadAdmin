import { useEffect, useState, useCallback } from "react";
import { api } from "./api";

const KEY = "adminToken";
const USER_KEY = "adminUser";

export type AdminRole = "superadmin" | "admin" | "support" | "verifier" | "finance";

export interface AdminUser {
  name?: string;
  fullName?: string;
  email: string;
  role: AdminRole;
  id?: string;
  _id?: string;
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY);
}

export function getAdmin(): AdminUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

function persistAdmin(user: AdminUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("admin:user-updated"));
}

export async function fetchAdminProfile(): Promise<AdminUser | null> {
  const token = getToken();
  if (!token) return null;
  const profile = await api.get<AdminUser>("/admin/me");
  persistAdmin(profile);
  return profile;
}

export async function login(email: string, password: string): Promise<{ token: string; user: AdminUser }> {
  const res: any = await api.post('/admin/login', { email, password });
  const token = res.token || res.data?.token;
  const user = res.admin || res.data?.admin;

  localStorage.setItem(KEY, token);
  persistAdmin(user);

  return { token, user };
}

export function logout() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(USER_KEY);
}

export function useAuth() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [ready, setReady] = useState(false);

  const refreshProfile = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      return null;
    }
    try {
      const profile = await fetchAdminProfile();
      setUser(profile);
      return profile;
    } catch {
      setUser(getAdmin());
      return getAdmin();
    }
  }, []);

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      const cached = getAdmin();
      if (cached) setUser(cached);
      if (getToken()) {
        await refreshProfile();
      }
      if (active) setReady(true);
    };
    bootstrap();
    const onUserUpdated = () => setUser(getAdmin());
    window.addEventListener("admin:user-updated", onUserUpdated);
    return () => {
      active = false;
      window.removeEventListener("admin:user-updated", onUserUpdated);
    };
  }, [refreshProfile]);

  return { user, ready, isAuthed: !!user, refreshProfile };
}
