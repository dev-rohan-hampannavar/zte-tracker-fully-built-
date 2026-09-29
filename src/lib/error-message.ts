type ErrorDetails = {
  code?: unknown;
  message?: unknown;
};

/** Convert thrown values and Supabase/PostgREST errors into useful UI text. */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "string" && error.trim()) return error.trim();

  const details = error && typeof error === "object" ? error as ErrorDetails : null;
  const code = typeof details?.code === "string" ? details.code : "";
  const message = error instanceof Error
    ? error.message
    : typeof details?.message === "string"
      ? details.message
      : "";

  if (code === "PGRST202" || code === "42883") {
    return "The database is missing the onboarding completion function. Apply the Supabase migrations through 0088, then refresh and try again.";
  }
  if (code === "42P01" || code === "42703" || code === "PGRST204" || code === "PGRST205") {
    return "The database setup is behind this app version. Apply the Supabase migrations through 0088, then refresh and try again.";
  }
  if (code === "PGRST116") {
    return "This account has no workspace settings row yet. Apply migration 0088, then refresh and try again.";
  }
  if (code === "23503") {
    return "That role or learning path is no longer available. Choose another role and try again.";
  }
  if (/failed to fetch|network request failed/i.test(message)) {
    return "The app could not reach the server. Check your connection and try again.";
  }

  return message.trim() || fallback;
}
