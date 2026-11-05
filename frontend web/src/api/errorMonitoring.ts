/**
 * Sentry error monitoring for the web app.
 *
 * Enabled only when VITE_SENTRY_DSN is provided at build time — the app
 * boots and functions normally without it (local dev, open-source builds).
 *
 * Errors are always captured (error monitoring is a strictly-necessary /
 * diagnostic purpose under the cookie policy, not the "analytics" toggle);
 * user IPs and other PII are never attached.
 */

let initialized = false;

export const initErrorMonitoring = async (): Promise<void> => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || initialized) return;

  try {
    const Sentry = await import("@sentry/react");
    Sentry.init({
      dsn,
      environment: import.meta.env.VITE_SENTRY_ENV ?? "production",
      // Keep performance tracing light; raise via env if needed.
      tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_RATE ?? 0.1),
      // The browser SDK has no sendDefaultPii option — strip PII in beforeSend instead.
      beforeSend(event) {
        if (event.request) {
          // Strip IP and cookie data defensively, even if SDK defaults change.
          event.request.headers = undefined;
          event.request.cookies = undefined;
          if (event.request.url?.startsWith('file://')) return null;
        }
        event.user = { id: undefined } as typeof event.user;
        return event;
      },
    });
    initialized = true;
  } catch {
    // @sentry/react not installed — ignore, monitoring stays off.
  }
};
