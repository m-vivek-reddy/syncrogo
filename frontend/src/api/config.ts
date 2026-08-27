const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const deriveBackendUrl = (): string => {
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;

    // 1. Devtunnels auto-detection (e.g., https://xyz-5173.inc1.devtunnels.ms -> https://xyz-8000.inc1.devtunnels.ms)
    const tunnelMatch = hostname.match(/^(.+)-5173(\..*\.devtunnels\.ms)$/);
    if (tunnelMatch) {
      return `${protocol}//${tunnelMatch[1]}-8000${tunnelMatch[2]}`;
    }

    // 2. If opened from a LAN IP or custom hostname, use port 8000 on the same host unless an explicit non-local URL is configured
    if (hostname !== "localhost" && hostname !== "127.0.0.1" && !hostname.endsWith(".localhost")) {
      const explicitEnv = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
      if (explicitEnv && !explicitEnv.includes("127.0.0.1") && !explicitEnv.includes("localhost")) {
        return explicitEnv;
      }
      return `${protocol}//${hostname}:8000`;
    }
  }

  return (
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:8000"
  );
};

export const API_BASE_URL = trimTrailingSlash(deriveBackendUrl());
