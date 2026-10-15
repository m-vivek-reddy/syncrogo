/**
 * In-memory navigation history tracker for step-by-step back navigation.
 * Tracks visited routes so BackButton always returns to the true previous step/screen.
 */

const historyStack: string[] = [];

/**
 * Records a route in the navigation history.
 */
export function recordRoute(route: string) {
  if (!route || route === "" || route === "/") return;

  // Avoid consecutive duplicates
  if (historyStack.length > 0 && historyStack[historyStack.length - 1] === route) {
    return;
  }

  historyStack.push(route);

  // Keep history bounded to avoid unbounded growth
  if (historyStack.length > 60) {
    historyStack.shift();
  }
}

/**
 * Returns and removes the previous route before the current route.
 */
export function getPreviousRoute(currentRoute?: string): string | null {
  // Pop the current route from the top if it matches
  if (currentRoute) {
    while (historyStack.length > 0 && historyStack[historyStack.length - 1] === currentRoute) {
      historyStack.pop();
    }
  }

  if (historyStack.length > 0) {
    return historyStack.pop() ?? null;
  }

  return null;
}

/**
 * Peeks at the previous route without popping it.
 */
export function peekPreviousRoute(currentRoute?: string): string | null {
  let idx = historyStack.length - 1;
  if (currentRoute && idx >= 0 && historyStack[idx] === currentRoute) {
    idx--;
  }
  return idx >= 0 ? historyStack[idx] : null;
}

/**
 * Resets the navigation history.
 */
export function clearHistory() {
  historyStack.length = 0;
}

