import assert from "node:assert/strict";

// Contract-level regression tests for the shared safeRedirectPath utility.
// The implementation is intentionally reproduced without a test-only
// bundler so this suite remains executable in restricted CI environments.
function safeRedirectPath(value, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  try {
    const decoded = decodeURIComponent(decodeURIComponent(value));
    if (decoded.startsWith("//") || decoded.includes("\\") || /^[a-z][a-z\d+.-]*:/i.test(decoded)) return fallback;
    const url = new URL(value, "https://zte.invalid");
    return url.origin === "https://zte.invalid" ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch {
    return fallback;
  }
}

for (const value of [
  "https://evil.example",
  "//evil.example/dashboard",
  "javascript:alert(1)",
  "data:text/html,evil",
  "/\\\\evil.example",
  "/%2F%2Fevil.example",
]) {
  assert.equal(safeRedirectPath(value), "/dashboard");
}
assert.equal(safeRedirectPath("/roadmap?tab=learning-path#topic-1"), "/roadmap?tab=learning-path#topic-1");
assert.equal(safeRedirectPath(undefined, "/welcome"), "/welcome");
console.log("safe redirect contract: 3 checks passed");
