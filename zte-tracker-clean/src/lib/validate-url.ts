/** Normalize an optional user-entered URL and reject dangerous schemes. */
export function normalizeHttpUrl(value: string | null | undefined): string | null {
  const input = value?.trim();
  if (!input) return null;
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Enter a valid URL beginning with https:// or http://");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only http:// and https:// links are allowed");
  }
  if (url.username || url.password) throw new Error("URLs with embedded credentials are not allowed");
  return url.toString();
}
