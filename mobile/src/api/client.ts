import { create } from "axios";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { useAuthStore } from "../store/auth";

/**
 * Remove trailing slashes from API URLs.
 */
const cleanUrl = (url: string): string => {
  return url.replace(/\/+$/, "");
};

/**
 * Get the development machine IP used by Expo.
 */
const getExpoHostIp = (): string | null => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri;

  if (!hostUri) {
    return null;
  }

  /*
   * Examples:
   * 192.168.0.103:8081
   * 192.168.0.103:19000
   */
  const host = hostUri.split(":")[0];

  if (
    host &&
    host !== "localhost" &&
    host !== "127.0.0.1"
  ) {
    return host;
  }

  return null;
};

/**
 * Get API base URL.
 */
export const getApiBaseUrl = (): string => {
  /*
   * 1. Explicit environment variable.
   *
   * Recommended for development:
   *
   * EXPO_PUBLIC_API_URL=http://192.168.0.103:8000
   */
  const envUrl = process.env.EXPO_PUBLIC_API_URL;

  if (envUrl && envUrl.trim()) {
    return cleanUrl(envUrl.trim());
  }

  /*
   * 2. Web.
   */
  if (
    Platform.OS === "web" &&
    typeof window !== "undefined"
  ) {
    const { protocol, hostname } = window.location;

    /*
     * Expo Dev Tunnel.
     */
    const tunnelMatch = hostname.match(
      /^(.+)-(?:8081|19006|3000|5173)(\..*\.devtunnels\.ms)$/
    );

    if (tunnelMatch) {
      return `${protocol}//${tunnelMatch[1]}-8000${tunnelMatch[2]}`;
    }

    /*
     * Frontend running from another machine.
     */
    if (
      hostname !== "localhost" &&
      hostname !== "127.0.0.1"
    ) {
      return `${protocol}//${hostname}:8000`;
    }

    return "https://syncrogo-backend.onrender.com";
  }

  /*
   * 3. Physical Android device running Expo Go.
   *
   * Expo exposes the development computer's LAN IP.
   */
  const expoHostIp = getExpoHostIp();

  if (expoHostIp && __DEV__) {
    return `http://${expoHostIp}:8000`;
  }

  /*
   * 4. Android Emulator.
   *
   * 10.0.2.2 points to the host computer.
   */
  if (Platform.OS === "android" && __DEV__) {
    return "http://10.0.2.2:8000";
  }

  /*
   * 5. iOS Simulator / production fallback.
   */
  return "https://syncrogo-backend.onrender.com";
};

export const API_BASE_URL = getApiBaseUrl();

console.log(
  "========================================"
);
console.log(
  "SyncroGo API Base URL:",
  API_BASE_URL
);
console.log(
  "Platform:",
  Platform.OS
);
console.log(
  "========================================"
);

/**
 * Axios client.
 */
const apiClient = create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Tunnel-Skip-AntiPhishing-Page": "true",
    "ngrok-skip-browser-warning": "true",
  },
  timeout: 15000,
});

/**
 * Add authentication token.
 */
apiClient.interceptors.request.use(
  (config) => {
    const token =
      useAuthStore.getState().token;

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Handle API responses/errors.
 */
apiClient.interceptors.response.use(
  (response) => response,

  async (error) => {
    /*
     * Server returned 401.
     */
    if (error.response?.status === 401) {
      try {
        await useAuthStore
          .getState()
          .logout();
      } catch (logoutError) {
        console.warn(
          "Logout after 401 failed:",
          logoutError
        );
      }
    }

    /*
     * Improve network error logging during development.
     */
    if (!error.response) {
      console.warn(
        "SyncroGo API network error:",
        {
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          message: error.message,
        }
      );
    }

    return Promise.reject(error);
  }
);

export default apiClient;