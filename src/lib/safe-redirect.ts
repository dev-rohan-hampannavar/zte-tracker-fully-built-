/** Returns a same-origin application path or the safe dashboard fallback. */
export function safeRedirectPath(value: string | null | undefined, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  try {
    // Decode twice so encoded and double-encoded protocol-relative paths
    // cannot become external redirects after a later framework decode.
    const decoded = decodeURIComponent(decodeURIComponent(value));
    if (
      decoded.startsWith("//") ||
      decoded.includes("\\") ||
      /^[a-z][a-z\d+.-]*:/i.test(decoded)
    ) return fallback;
    const url = new URL(value, "https://zte.invalid");
    return url.origin === "https://zte.invalid" ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch {
    return fallback;
  }
}
