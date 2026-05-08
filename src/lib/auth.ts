import { useEffect, useState } from "react";

const KEY = "adminToken";
const USER_KEY = "adminUser";

export interface AdminUser {
  name: string;
  email: string;
  role: "superadmin" | "admin";
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

export function login(email: string, password: string): Promise<{ token: string; user: AdminUser }> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (email && password.length >= 4) {
        const user: AdminUser = {
          name: email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
          email,
          role: email.includes("super") ? "superadmin" : "admin",
        };
        const token = "mock-jwt-" + Math.random().toString(36).slice(2);
        localStorage.setItem(KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        resolve({ token, user });
      } else {
        reject(new Error("Invalid credentials. Please check email and password."));
      }
    }, 700);
  });
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
