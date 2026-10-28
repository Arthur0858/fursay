import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/worker.js";

const EMAIL = "family+test@example.test";
const TOKEN = "synthetic-api-token";
const ENV = {
  MAILERLITE_API_TOKEN: TOKEN,
  MAILERLITE_GROUP_FURSAY_ALL: "all",
  MAILERLITE_GROUP_KOKO: "koko",
  MAILERLITE_GROUP_NOOR: "noor"
};

async function subscribe({ env = ENV, body = {}, provider } = {}) {
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  const originalLog = console.log;
  const calls = [];
  const logs = [];
  globalThis.fetch = async (url, init) => {
    const call = { url, ...init };
    calls.push(call);
    return provider ? provider(call, calls.length) : new Response("{}", { status: 201 });
  };
  const capture = (level) => (...args) => {
    assert.equal(args.length, 1);
    assert.equal(typeof args[0], "string");
    assert.equal(args[0].includes(EMAIL), false);
    assert.equal(args[0].includes(encodeURIComponent(EMAIL)), false);
    assert.equal(args[0].includes(TOKEN), false);
    const entry = JSON.parse(args[0]);
    for (const key of ["event", "status", "groups_count", "region"]) assert.ok(Object.hasOwn(entry, key));
    logs.push({ level, ...entry });
  };
  console.error = capture("error");
  console.log = capture("log");
  try {
    const response = await worker.fetch(new Request("https://fursay.com/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL, groups: ["koko", "noor"], region: "TW", ...body })
    }), env);
    return { status: response.status, body: await response.json(), calls, logs };
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalError;
    console.log = originalLog;
  }
}

test("new subscriptions send each configured target group once", async () => {
  const result = await subscribe({ env: { ...ENV, MAILERLITE_GROUP_NOOR: "koko" } });
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.calls.length, 1);
  assert.deepEqual(JSON.parse(result.calls[0].body).groups, ["all", "koko"]);
  assert.equal(result.logs.at(-1).groups_count, 2);
  assert.equal(result.logs.at(-1).region, "TW");
});

test("missing default or requested group config is logged while available groups continue", async () => {
  for (const missing of [
    ["MAILERLITE_GROUP_FURSAY_ALL"],
    ["MAILERLITE_GROUP_KOKO"],
    ["MAILERLITE_GROUP_NOOR"],
    ["MAILERLITE_GROUP_FURSAY_ALL", "MAILERLITE_GROUP_KOKO", "MAILERLITE_GROUP_NOOR"]
  ]) {
    const env = { ...ENV };
    for (const name of missing) delete env[name];
    const result = await subscribe({ env });
    assert.equal(result.status, 200);
    const warning = result.logs.find((entry) => entry.event === "subscribe_config_missing");
    assert.equal(warning.level, "error");
    assert.deepEqual(warning.missing, missing);
    assert.equal(warning.groups_count, 3 - missing.length);
    const payload = JSON.parse(result.calls[0].body);
    assert.deepEqual(payload.groups || [], Object.keys(ENV).filter((name) => name.startsWith("MAILERLITE_GROUP_") && !missing.includes(name)).map((name) => ENV[name]));
  }
});

test("missing unrequested group config is not reported", async () => {
  const result = await subscribe({ env: { MAILERLITE_API_KEY: TOKEN, MAILERLITE_GROUP_FURSAY_ALL: "all" }, body: { groups: ["unknown"] } });
  assert.equal(result.status, 200);
  assert.equal(result.logs.some((entry) => entry.event === "subscribe_config_missing"), false);
});

test("409 assigns every deduplicated target group using the returned subscriber ID", async () => {
  const result = await subscribe({
    env: { ...ENV, MAILERLITE_GROUP_NOOR: "koko" },
    provider: (_call, index) => index === 1
      ? Response.json({ data: { id: "subscriber/id" } }, { status: 409 })
      : new Response("{}", { status: 201 })
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.deepEqual(result.calls.slice(1).map((call) => call.url), [
    "https://connect.mailerlite.com/api/subscribers/subscriber%2Fid/groups/all",
    "https://connect.mailerlite.com/api/subscribers/subscriber%2Fid/groups/koko"
  ]);
  for (const call of result.calls.slice(1)) {
    assert.equal(call.method, "POST");
    assert.equal(call.headers.Authorization, `Bearer ${TOKEN}`);
    assert.equal(call.body, undefined);
  }
});

test("409 without a usable response ID falls back to encoded email and group IDs", async () => {
  for (const conflictBody of ["not JSON", "{}", '{"data":{"id":123}}']) {
    const result = await subscribe({
      env: { MAILERLITE_API_TOKEN: TOKEN, MAILERLITE_GROUP_FURSAY_ALL: "group/id" },
      body: { groups: [] },
      provider: (_call, index) => new Response(index === 1 ? conflictBody : "{}", { status: index === 1 ? 409 : 200 })
    });
    assert.equal(result.status, 200);
    const subscriber = conflictBody.includes("123") ? "123" : encodeURIComponent(EMAIL);
    assert.equal(result.calls[1].url, `https://connect.mailerlite.com/api/subscribers/${subscriber}/groups/group%2Fid`);
  }
});

test("any failed or thrown group assignment returns 502 while attempting every target", async () => {
  for (const failure of [409, 422, 503, "network"]) {
    const result = await subscribe({ provider: (_call, index) => {
      if (index === 1) return Response.json({}, { status: 409 });
      if (index === 3) {
        if (failure === "network") throw new Error(`${EMAIL} ${TOKEN}`);
        return new Response(`${EMAIL} ${TOKEN}`, { status: failure });
      }
      return new Response("{}", { status: 200 });
    } });
    assert.equal(result.status, 502);
    assert.deepEqual(result.body, { success: false });
    assert.equal(result.calls.length, 4);
    assert.equal(result.logs.some((entry) => entry.event === "subscribe_completed"), false);
    assert.equal(result.logs.filter((entry) => entry.event === "subscribe_group_assignment" && entry.level === "error").length, 1);
  }
});

test("provider errors, exceptions and untrusted region never expose email or token in logs", async () => {
  for (const throws of [false, true]) {
    const result = await subscribe({ body: { region: `${EMAIL} ${TOKEN}` }, provider: () => {
      if (throws) throw new Error(`${EMAIL} ${TOKEN}`);
      return new Response(`${EMAIL} ${TOKEN}`, { status: 503 });
    } });
    assert.equal(result.status, throws ? 500 : 502);
    assert.equal(result.body.success, false);
    assert.equal(result.calls.length, 1);
    assert.equal(result.logs.at(-1).region, "unknown");
  }
});

test("missing token is a structured configuration failure with no upstream calls", async () => {
  const env = { ...ENV };
  delete env.MAILERLITE_API_TOKEN;
  const result = await subscribe({ env });
  assert.equal(result.status, 500);
  assert.equal(result.body.success, false);
  assert.equal(result.calls.length, 0);
  assert.equal(result.logs[0].event, "subscribe_config_missing");
});

test("honeypot returns pending without provider calls", async () => {
  const result = await subscribe({ body: { website: "bot" } });
  assert.deepEqual(result.body, { success: true, pending: true, status: "pending_confirmation" });
  assert.equal(result.calls.length, 0);
  assert.equal(result.logs[0].event, "subscribe_honeypot");
});
test("provider status selects pending response", async () => {
  for (const [status, pending] of [["unconfirmed", true], ["active", false]]) {
    const result = await subscribe({ provider: () => Response.json({ data: { status } }) });
    assert.equal(result.body.pending, pending);
    assert.equal(result.body.status, pending ? "pending_confirmation" : "subscribed");
    assert.equal(result.body.message, "Subscribed!");
  }
});
test("conflict response reports subscribed", async () => {
  const result = await subscribe({ provider: (_call, index) => Response.json({}, { status: index === 1 ? 409 : 200 }) });
  assert.equal(result.body.pending, false);
  assert.equal(result.body.status, "subscribed");
});
