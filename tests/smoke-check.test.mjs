import assert from "node:assert/strict";
import { runSmoke } from "../scripts/smoke-check.mjs";

const logs = [];
const result = await runSmoke({
  base: "https://test.invalid",
  log: (line) => logs.push(line),
  fetchImpl: async (url) => {
    const path = new URL(url).pathname;
    if (path === "/api/health") {
      return {
        status: 200,
        url,
        headers: { get: (name) => name === "content-type" ? "application/json" : null },
        json: async () => ({ status: "ok", dependencies: { database: "ok" } }),
      };
    }
    return {
      status: 200,
      url,
      headers: { get: () => "text/html" },
    };
  },
});

assert.deepEqual(result.failures, []);
assert.ok(logs.includes("smoke /api/health: 200 (ok)"));
assert.equal(result.count, 5);

const redirectResult = await runSmoke({
  base: "https://test.invalid",
  fetchImpl: async (url) => {
    const path = new URL(url).pathname;
    return {
      status: 200,
      url: path === "/api/health" ? "https://test.invalid/login" : url,
      headers: { get: (name) => path === "/api/health" ? "text/html" : (name === "content-type" ? "text/html" : null) },
      json: async () => ({ status: "ok", dependencies: { database: "ok" } }),
    };
  },
});
assert.ok(redirectResult.failures.some((failure) => failure.includes("health must remain public")));
console.log("smoke contract: public JSON health payload accepted");
