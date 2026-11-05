import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../../api/analytics';

/**
 * Fires a page_view on every route change.
 * Mount ONCE, inside <BrowserRouter>, above <Routes>.
 *
 * Tracking itself is consent-gated inside api/analytics.ts — when the user
 * has not allowed analytics cookies this component is effectively a no-op.
 */
export const AnalyticsTracker = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  return null;
};
