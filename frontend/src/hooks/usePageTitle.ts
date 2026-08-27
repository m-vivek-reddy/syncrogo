import { useEffect } from "react";

export function usePageTitle(title: string) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title ? `${title} | SyncroGo` : "SyncroGo - Travel Together. Save Together.";
    return () => {
      document.title = prevTitle;
    };
  }, [title]);
}
