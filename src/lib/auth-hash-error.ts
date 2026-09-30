// Supabase reports expired/invalid magic links in the URL *hash*
// (#error=access_denied&error_code=otp_expired&error_description=...), which
// the server never sees and nothing in the app read, so users landed on
// unrelated pages with a raw error string stuck in the address bar.

const MESSAGES: Record<string, string> = {
  otp_expired: "That sign-in link has expired or was already used. Request a new one from the login page.",
  access_denied: "Sign-in was denied. Request a new link from the login page.",
};

export function parseAuthHashError(hash: string): string | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw || !raw.includes("error")) return null;
  const params = new URLSearchParams(raw);
  if (!params.get("error") && !params.get("error_code")) return null;
  const code = params.get("error_code") ?? params.get("error") ?? "";
  return MESSAGES[code] ?? MESSAGES[params.get("error") ?? ""] ?? "Sign-in failed. Please request a new link.";
}
