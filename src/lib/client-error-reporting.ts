type ClientErrorContext = Record<string, unknown>;

export function reportClientError(error: unknown, context: ClientErrorContext = {}) {
  const route = typeof window === "undefined" ? undefined : window.location.pathname;

  console.error("Application route error", {
    error,
    route,
    ...context,
  });
}
