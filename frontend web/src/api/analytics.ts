import { loadCookieConsent } from './consent';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackPageView(path: string): void {
  if (!loadCookieConsent()?.analytics) return;
  window.gtag?.('event', 'page_view', { page_path: path });
}
