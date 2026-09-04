import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { create } from "zustand";

export const TOKEN_KEY = "syncrogo_token";
export const USER_KEY = "syncrogo_user";
export const MODE_KEY = "syncrogo_mode";

export const isSecureStoreAvailable = async (): Promise<boolean> => {
  if (Platform.OS === "web") return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
};

export const storageGet = async (key: string): Promise<string | null> => {
  try {
    if (await isSecureStoreAvailable()) {
      return await SecureStore.getItemAsync(key);
    }
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(key);
    }
  } catch {
    // fallback
  }
  return null;
};

export const storageSet = async (key: string, value: string): Promise<void> => {
  try {
    if (await isSecureStoreAvailable()) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, value);
    }
  } catch {
    // fallback
  }
};

export const storageDelete = async (key: string): Promise<void> => {
  try {
    if (await isSecureStoreAvailable()) {
      await SecureStore.deleteItemAsync(key);
      return;
    }
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(key);
    }
  } catch {
    // fallback
  }
};

export type AuthUser = {
  id?: number | string;
  name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  role?: string;
  rating?: number;
  is_verified?: boolean;
  profile_photo_url?: string;
  created_at?: string;
  location?: string;
  completed_trips?: number;
};

type Mode = "passenger" | "driver";

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  mode: Mode;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setToken: (token: string | null) => Promise<void>;
  login: (token: string, user?: AuthUser | null) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => Promise<void>;
  setMode: (mode: Mode) => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  mode: "passenger",
  hydrated: false,
  hydrate: async () => {
    try {
      const [token, storedUser, storedMode] = await Promise.all([
        storageGet(TOKEN_KEY),
        storageGet(USER_KEY),
        storageGet(MODE_KEY),
      ]);
      const parsedUser = storedUser ? JSON.parse(storedUser) : null;
      set({
        token,
        user: parsedUser,
        mode: storedMode === "driver" ? "driver" : "passenger",
        hydrated: true,
      });
    } catch {
      set({ token: null, user: null, mode: "passenger", hydrated: true });
    }
  },
  setToken: async (token) => {
    if (token) {
      await storageSet(TOKEN_KEY, token);
    } else {
      await storageDelete(TOKEN_KEY);
    }
    set({ token });
  },
  login: async (token, user = null) => {
    await storageSet(TOKEN_KEY, token);
    if (user) {
      await storageSet(USER_KEY, JSON.stringify(user));
    } else {
      await storageDelete(USER_KEY);
    }
    set({ token, user });
  },
  logout: async () => {
    await Promise.all([
      storageDelete(TOKEN_KEY),
      storageDelete(USER_KEY),
      storageDelete(MODE_KEY),
    ]);
    set({ token: null, user: null, mode: "passenger" });
  },
  setUser: async (user) => {
    if (user) {
      await storageSet(USER_KEY, JSON.stringify(user));
    } else {
      await storageDelete(USER_KEY);
    }
    set({ user });
  },
  setMode: async (mode) => {
    await storageSet(MODE_KEY, mode);
    set({ mode });
  },
}));
