import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { router } from "expo-router";
import {
  storageGet,
  storageSet,
  storageDelete,
  TOKEN_KEY,
  useAuthStore,
  AuthUser,
} from "../store/auth";
import { API_BASE_URL } from "../api/client";

export { TOKEN_KEY };

export type User = AuthUser;

export type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<any>;
  verifyOtp: (email: string, otp: string) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function restoreSession() {
    try {
      const savedToken = await storageGet(TOKEN_KEY);
      if (!savedToken) {
        setLoading(false);
        return;
      }
      setToken(savedToken);
      await useAuthStore.getState().setToken(savedToken);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
          headers: {
            Authorization: `Bearer ${savedToken}`,
            Accept: "application/json",
            "X-Tunnel-Skip-AntiPhishing-Page": "true",
            "ngrok-skip-browser-warning": "true",
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (response.ok) {
          const currentUser = await response.json();
          setUser(currentUser);
          await useAuthStore.getState().login(savedToken, currentUser);
        } else if (response.status === 401 || response.status === 403) {
          await storageDelete(TOKEN_KEY);
          setToken(null);
          setUser(null);
          await useAuthStore.getState().logout();
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.log("Saved token check error or timeout:", error);
      }
    } catch (error) {
      console.error("Session restore error:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void restoreSession();
  }, []);

  async function login(email: string, password: string) {
    const cleanEmail = email.trim().toLowerCase();

    console.log(`[Auth] Attempting login for ${cleanEmail} via ${API_BASE_URL}/login`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Tunnel-Skip-AntiPhishing-Page": "true",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          email: cleanEmail,
          password: password,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      const isAbort = fetchError.name === "AbortError";
      console.warn(`[Auth] Login fetch error at ${API_BASE_URL}/login:`, fetchError);
      const err: any = new Error(
        isAbort
          ? `Login request timed out reaching ${API_BASE_URL}. Please verify your backend server is active and accessible.`
          : `Network error: Unable to reach backend at ${API_BASE_URL}`
      );
      err.detail = err.message;
      throw err;
    }

    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      const detailMsg =
        data?.detail || data?.message || "Incorrect email or password";
      const err: any = new Error(detailMsg);
      err.status = res.status;
      err.detail = detailMsg;
      throw err;
    }

    const accessToken =
      data?.access_token || data?.token || data?.data?.access_token;
    if (accessToken) {
      await storageSet(TOKEN_KEY, accessToken);
      setToken(accessToken);
      await useAuthStore.getState().setToken(accessToken);

      const returnedUser = data?.user || null;
      if (returnedUser) {
        setUser(returnedUser);
        await useAuthStore.getState().login(accessToken, returnedUser);
      } else {
        try {
          const userRes = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
              "X-Tunnel-Skip-AntiPhishing-Page": "true",
              "ngrok-skip-browser-warning": "true",
            },
          });
          if (userRes.ok) {
            const currentUser = await userRes.json();
            setUser(currentUser);
            await useAuthStore.getState().login(accessToken, currentUser);
          } else {
            await useAuthStore.getState().login(accessToken, null);
          }
        } catch {
          await useAuthStore.getState().login(accessToken, null);
        }
      }
    }

    return data;
  }

  async function verifyOtp(email: string, otp: string) {
    let response: Response | null = null;
    try {
      response = await fetch(`${API_BASE_URL}/api/v1/users/verify-login-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Tunnel-Skip-AntiPhishing-Page": "true",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ email, otp }),
      });
    } catch { }

    if (!response || !response.ok) {
      try {
        response = await fetch(`${API_BASE_URL}/api/v1/users/verify-otp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-Tunnel-Skip-AntiPhishing-Page": "true",
            "ngrok-skip-browser-warning": "true",
          },
          body: JSON.stringify({ email, otp }),
        });
      } catch { }
    }

    if (!response) {
      throw new Error(
        `Network error: Unable to reach backend at ${API_BASE_URL}`
      );
    }

    const text = await response.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      throw new Error(data?.detail || data?.message || "Invalid or expired OTP");
    }

    const accessToken = data?.access_token || data?.token || data?.data?.access_token;
    if (!accessToken) {
      throw new Error(
        data?.detail ||
          data?.message ||
          "OTP verified but no session token was returned. Please try logging in."
      );
    }

    await storageSet(TOKEN_KEY, accessToken);
    setToken(accessToken);
    await useAuthStore.getState().setToken(accessToken);

    try {
      const userRes = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "X-Tunnel-Skip-AntiPhishing-Page": "true",
          "ngrok-skip-browser-warning": "true",
        },
      });
      if (userRes.ok) {
        const currentUser = await userRes.json();
        setUser(currentUser);
        await useAuthStore.getState().login(accessToken, currentUser);
      } else {
        await useAuthStore.getState().login(accessToken, null);
      }
    } catch {
      await useAuthStore.getState().login(accessToken, null);
    }

    return data;
  }

  async function refreshUser() {
    if (!token) return;
    try {
      const userRes = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "X-Tunnel-Skip-AntiPhishing-Page": "true",
          "ngrok-skip-browser-warning": "true",
        },
      });
      if (userRes.ok) {
        const currentUser = await userRes.json();
        setUser(currentUser);
        await useAuthStore.getState().setUser(currentUser);
      }
    } catch { }
  }

  async function logout() {
    try {
      await storageDelete(TOKEN_KEY);
      setToken(null);
      setUser(null);
      await useAuthStore.getState().logout();

      // Always send the user to Login after sign out
      router.replace("/(auth)/login");
    } catch (error) {
      console.error("[Auth] Logout error:", error);

      // Even if storage cleanup fails, don't leave
      // the user stuck on an authenticated screen.
      router.replace("/(auth)/login");
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token,
        login,
        verifyOtp,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
