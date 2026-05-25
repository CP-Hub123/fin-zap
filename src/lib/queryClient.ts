import { QueryClient } from "@tanstack/react-query";

/**
 * Shared QueryClient instance — exported so non-React modules
 * (e.g. AuthContext) can clear the cache on sign-out / user change
 * to guarantee no cross-tenant data leak via React Query cache.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/**
 * Keys in localStorage that belong to a specific user session and
 * MUST be purged when switching accounts. Theme / push-prompt dismiss
 * are intentionally left intact (device preferences, not user data).
 */
const USER_SCOPED_LS_KEYS = [
  "finzap:selectedMonthId",
];
const USER_SCOPED_LS_PREFIXES = [
  "finzap:cofrinho_autoclose:",
  "finzap:recurring_run:",
];

export const resetClientSessionState = () => {
  try {
    queryClient.cancelQueries();
    queryClient.clear();
  } catch {}
  try {
    for (const k of USER_SCOPED_LS_KEYS) localStorage.removeItem(k);
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && USER_SCOPED_LS_PREFIXES.some((p) => k.startsWith(p))) {
        localStorage.removeItem(k);
      }
    }
  } catch {}
};