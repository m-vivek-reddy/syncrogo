import { apiClient } from "./client";

type CurrentUser = { role?: string; [key: string]: unknown };

let cachedToken: string | null = null;
let cachedRequest: Promise<CurrentUser> | null = null;

export function primeCurrentUser(token: string, user: CurrentUser) {
  cachedToken = token;
  cachedRequest = Promise.resolve(user);
}

/**
 * Reuse the current-session lookup while the access token is unchanged.
 * Nested route guards otherwise make identical network requests on one visit.
 */
export function getCurrentUser<T = CurrentUser>(token: string): Promise<T> {
  if (cachedToken !== token || !cachedRequest) {
    cachedToken = token;
    cachedRequest = apiClient
      .get<CurrentUser>("/api/v1/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => response.data)
      .catch((error) => {
        cachedToken = null;
        cachedRequest = null;
        throw error;
      });
  }

  return cachedRequest as Promise<T>;
}
