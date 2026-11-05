const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");
const DEFAULT_BACKEND_URL = "https://syncrogo-backend.onrender.com";

export const deriveBackendUrl = (): string => {
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;

    // 1. Devtunnels auto-detection (e.g., https://xyz-5174.inc1.devtunnels.ms -> https://xyz-8000.inc1.devtunnels.ms)
    const tunnelMatch = hostname.match(/^(.+)-(?:5173|5174)(\..*\.devtunnels\.ms)$/);
    if (tunnelMatch) {
      return `${protocol}//${tunnelMatch[1]}-8000${tunnelMatch[2]}`;
    }

    // 2. Local network IP or custom hostname -> default to backend port 8000
    if (hostname !== "localhost" && hostname !== "127.0.0.1" && !hostname.endsWith(".localhost")) {
      const explicitEnv = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
      if (explicitEnv && !explicitEnv.includes("127.0.0.1") && !explicitEnv.includes("localhost")) {
        return explicitEnv;
      }
      return DEFAULT_BACKEND_URL;
    }
  }

  return (
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    DEFAULT_BACKEND_URL
  );
};

export const API_BASE_URL = trimTrailingSlash(deriveBackendUrl());
