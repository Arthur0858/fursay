import test from "node:test";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { waitForRequiredEvents } from "../scripts/check-conversion-health-contract.mjs";

test("already observed required receipts pass immediately", async () => {
  assert.equal(await waitForRequiredEvents([{ event: "interest" }, { event: "open" }], ["open", "interest"], 0), true);
});

test("a real asynchronous receipt arriving after the former160ms snapshot is observed", async () => {
  const events = [];
  const delivery = delay(240).then(() => events.push({ event: "interest" }));
  await delay(160);
  assert.equal(events.some((event) => event.event === "interest"), false);
  assert.equal(await waitForRequiredEvents(events, ["interest"], 500), true);
  await delivery;
});

test("a required receipt that never arrives remains missing after the finite bound", async () => {
  const events = [{ event: "open" }];
  assert.equal(await waitForRequiredEvents(events, ["open", "interest"], 60), false);
  assert.deepEqual(events, [{ event: "open" }]);
});

test("another event name cannot substitute for the required receipt", async () => {
  assert.equal(await waitForRequiredEvents([{ event: "other" }], ["interest"], 40), false);
});

test("all required event names must be observed, including delayed partial delivery", async () => {
  const events = [{ event: "open" }];
  const delivery = delay(90).then(() => events.push({ event: "interest" }));
  assert.equal(await waitForRequiredEvents(events, ["open", "interest"], 500), true);
  await delivery;
});

test("an empty observer with an exhausted bound fails without manufacturing a receipt", async () => {
  const events = [];
  assert.equal(await waitForRequiredEvents(events, ["interest"], 0), false);
  assert.deepEqual(events, []);
});
