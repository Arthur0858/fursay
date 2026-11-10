import assert from "node:assert/strict";
import test from "node:test";
import worker, { verifyTurnstile } from "../src/worker.js";

const SECRET = "synthetic-turnstile-secret";
const ENV = {
  MAILERLITE_API_TOKEN: "synthetic-api-token",
  MAILERLITE_GROUP_FURSAY_ALL: "all",
  MAILERLITE_GROUP_KOKO: "koko"
};
const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const MAILERLITE = "https://connect.mailerlite.com/api/subscribers";

async function subscribe({ env = ENV, body = {}, siteverify } = {}) {
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const originalError = console.error;
  const calls = [];
  const logs = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url) === SITEVERIFY) {
      if (!siteverify) throw new Error("unexpected siteverify call");
      return siteverify({ url: String(url), init });
    }
    return new Response(JSON.stringify({ data: { status: "active" } }), { status: 201 });
  };
  console.log = (line) => logs.push(line);
  console.error = (line) => logs.push(line);
  try {
    const response = await worker.fetch(new Request("https://fursay.com/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.7" },
      body: JSON.stringify({ email: "family+turnstile@example.test", groups: ["koko"], ...body })
    }), env);
    return { status: response.status, body: await response.json(), calls, logs };
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
    console.error = originalError;
  }
}

const ok = (overrides = {}) => () => new Response(JSON.stringify({ success: true, action: "subscribe", hostname: "fursay.com", ...overrides }), { status: 200 });

test("without TURNSTILE_SECRET_KEY the subscribe flow is unchanged and siteverify is never called", async () => {
  const result = await subscribe();
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.deepEqual(result.calls.map((call) => call.url), [MAILERLITE]);
  assert.equal(JSON.parse(result.calls[0].init.body)["cf-turnstile-response"], undefined);
  const skipped = await verifyTurnstile({}, new Request("https://fursay.com/api/subscribe"), { TURNSTILE_SECRET_KEY: "  " });
  assert.deepEqual(skipped, { ok: true, skipped: true });
});

test("with the secret, a missing, empty, non-string, or oversized token is 403 before any provider call", async () => {
  for (const token of [undefined, "", 42, "x".repeat(2049)]) {
    const result = await subscribe({ env: { ...ENV, TURNSTILE_SECRET_KEY: SECRET }, body: token === undefined ? {} : { "cf-turnstile-response": token } });
    assert.equal(result.status, 403);
    assert.equal(result.body.success, false);
    assert.equal(result.body.field, "cf-turnstile-response");
    assert.equal(result.calls.length, 0);
  }
});

test("a valid token for the subscribe action and fursay hostname reaches MailerLite once", async () => {
  let verifyBody;
  const result = await subscribe({
    env: { ...ENV, TURNSTILE_SECRET_KEY: SECRET },
    body: { "cf-turnstile-response": "token-ok" },
    siteverify: ({ init }) => { verifyBody = new URLSearchParams(init.body); return ok()(); }
  });
  assert.equal(result.status, 200);
  assert.deepEqual(result.calls.map((call) => call.url), [SITEVERIFY, MAILERLITE]);
  assert.equal(verifyBody.get("secret"), SECRET);
  assert.equal(verifyBody.get("response"), "token-ok");
  assert.equal(verifyBody.get("remoteip"), "203.0.113.7");
  assert.equal(result.logs.some((line) => line.includes(SECRET) || line.includes("token-ok")), false);
  const www = await subscribe({ env: { ...ENV, TURNSTILE_SECRET_KEY: SECRET }, body: { "cf-turnstile-response": "t" }, siteverify: ok({ hostname: "www.fursay.com" }) });
  assert.equal(www.status, 200);
});

test("failed, wrong-action, or wrong-hostname verification is 403 and never calls MailerLite", async () => {
  for (const response of [{ success: false }, { action: "lead" }, { hostname: "evil.example" }, { hostname: "localhost" }]) {
    const result = await subscribe({ env: { ...ENV, TURNSTILE_SECRET_KEY: SECRET }, body: { "cf-turnstile-response": "t" }, siteverify: ok(response) });
    assert.equal(result.status, 403, JSON.stringify(response));
    assert.deepEqual(result.calls.map((call) => call.url), [SITEVERIFY]);
  }
});

test("TURNSTILE_HOSTNAMES overrides the default hostname allowlist", async () => {
  const env = { ...ENV, TURNSTILE_SECRET_KEY: SECRET, TURNSTILE_HOSTNAMES: " preview.fursay.com " };
  const allowed = await subscribe({ env, body: { "cf-turnstile-response": "t" }, siteverify: ok({ hostname: "preview.fursay.com" }) });
  assert.equal(allowed.status, 200);
  const blocked = await subscribe({ env, body: { "cf-turnstile-response": "t" }, siteverify: ok() });
  assert.equal(blocked.status, 403);
});

test("siteverify network errors and non-2xx responses are 503 without MailerLite calls", async () => {
  for (const siteverify of [() => { throw new Error("down"); }, () => new Response("bad", { status: 500 })]) {
    const result = await subscribe({ env: { ...ENV, TURNSTILE_SECRET_KEY: SECRET }, body: { "cf-turnstile-response": "t" }, siteverify });
    assert.equal(result.status, 503);
    assert.deepEqual(result.calls.map((call) => call.url), [SITEVERIFY]);
  }
});

test("honeypot and email validation still run before Turnstile", async () => {
  const env = { ...ENV, TURNSTILE_SECRET_KEY: SECRET };
  const honeypot = await subscribe({ env, body: { website: "bot" } });
  assert.equal(honeypot.status, 200);
  assert.equal(honeypot.body.pending, true);
  assert.equal(honeypot.calls.length, 0);
  const invalid = await subscribe({ env, body: { email: "not-an-email" } });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.calls.length, 0);
});
