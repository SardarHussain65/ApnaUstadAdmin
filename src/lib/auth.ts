import { useEffect, useState } from "react";
import { api } from "./api"; // Live backend wrapper

const KEY = "adminToken";
const USER_KEY = "adminUser";

export interface AdminUser {
  name?: string;
  fullName?: string;
  email: string;
  role: "superadmin" | "admin";
  id?: string;
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

export async function login(email: string, password: string): Promise<{ token: string; user: AdminUser }> {
  try {
    const res: any = await api.post('/admin/login', { email, password });
    
    // Store token and user based on your backend response format
    const token = res.token || res.data?.token;
    const user = res.admin || res.data?.admin;

    localStorage.setItem(KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    
    return { token, user };
  } catch (error: any) {
    throw new Error(error.message || "Invalid credentials. Please check email and password.");
  }
}

export function logout() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(USER_KEY);
}

export function useAuth() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setUser(getAdmin());
    setReady(true);
  }, []);
  return { user, ready, isAuthed: !!user };
}
