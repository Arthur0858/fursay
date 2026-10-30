import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { rollingSlots, sanitizeInventory, planSlots, requireGap, assertAllowedEpisode,
  acquireRunLock, writeLedger, readLedger } from "./koko-slot-ledger.mjs";

const now = Date.parse("2026-10-02T20:00:00+08:00");
const slots = rollingSlots(now);
const subjects = Object.fromEntries(slots.map(s => [s.episodeNo, `Subject ${s.episodeNo}`]));
function inventory() {
  return { channel: "koko", browserReady: true, tabId: "existing-tab", observedAt: new Date(now).toISOString(),
    coverage: Object.fromEntries(["outbox", "sent", "drafts"].map(k => [k, { total: k === "outbox" ? 4 : 0,
      observedCount: k === "outbox" ? 4 : 0, pageSize: 2, pagesRead: k === "outbox" ? [1, 2] : [1],
      otherChannelCount: 0, protectedCount: 0 }])),
    items: slots.map((s, i) => ({ ...s, section: "outbox", status: "scheduled", campaignId: `${100 + i}`,
      campaignUrl: `https://dashboard.mailerlite.com/campaigns/${100 + i}/review`, readback: {
        status: "scheduled", scheduledAt: s.scheduledAt, sender: "Fursay (hello@fursay.com)",
        audience: "KOKO subscribers (1)", subject: subjects[s.episodeNo], readbackAt: new Date(now).toISOString(),
        contentVerified: true } })) };
}
function ledger(input = inventory()) {
  return { version: 1, authority: "codex", jobs: {}, inventory: sanitizeInventory(input, subjects, now) };
}
function gapLedger() {
  const input = inventory(); input.items = [];
  input.coverage.outbox = { total: 0, observedCount: 0, pageSize: 2, pagesRead: [1], otherChannelCount: 0, protectedCount: 0 };
  return ledger(input);
}

test("four future Monday 09:00 slots use provider chronology, not lastSentEpisodeNo=51", () => {
  assert.deepEqual(slots.map(s => [s.episodeNo, s.date]), [[12,"2026-10-05"],[13,"2026-10-12"],[14,"2026-10-19"],[15,"2026-10-26"]]);
  assert.equal(rollingSlots(Date.parse("2026-10-05T09:00:00+08:00"))[0].date, "2026-10-12");
});
test("existing scheduled slots are preserved with zero new gaps", () => {
  const value = ledger(), before = JSON.stringify(value);
  assert.ok(planSlots(value, now).every(s => s.decision === "existing_scheduled"));
  assert.equal(JSON.stringify(value), before);
  assert.throws(() => requireGap(value, 12, slots[0].date, now), /slot_not/);
});
test("all Outbox pages and exact classified row counts are required", () => {
  for (const mutate of [i => i.coverage.outbox.pagesRead.pop(), i => i.items.pop(),
    i => i.coverage.sent.observedCount++, i => delete i.coverage.drafts,
    i => i.coverage.outbox.pagesRead.reverse()]) {
    const input = inventory(); mutate(input);
    assert.throws(() => ledger(input), /inventory_incomplete/);
  }
});
test("EP007 excluded by number and filename in all runner modes before any file read", async () => {
  for (const value of ["x-koko-ep007.newsletter.json", "ep7.json", "EP0007.json"]) {
    assert.throws(() => assertAllowedEpisode("koko", null, value), /protected_episode/);
  }
  assert.throws(() => assertAllowedEpisode("koko", 7), /protected_episode/);
  assert.throws(() => assertAllowedEpisode("arabic", null, "x-koko-ep007.newsletter.json"), /protected_episode/);
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "koko-protected-"));
  const runner = fileURLToPath(new URL("./newsletter-runner.mjs", import.meta.url));
  try {
    for (const mode of ["prepare", "api-preflight", "send", "chrome-handoff", "chrome-result", "legacy", "rolling-plan"]) {
      const result = spawnSync(process.execPath, [runner, "--channel", "koko", "--mode", mode,
        "--input", "DOES-NOT-EXIST-koko-ep007.newsletter.json"], { cwd: root, encoding: "utf8" });
      assert.notEqual(result.status, 0); assert.match(result.stderr, /protected_episode_ep007/);
      assert.doesNotMatch(result.stderr, /ENOENT|MAILERLITE_API_TOKEN/);
    }
    assert.deepEqual(await fs.readdir(root), []);
  } finally { await fs.rm(root, { recursive: true }); }
});
test("protected campaign is counted without opening it or persisting its identity", () => {
  const input = inventory(); input.coverage.outbox.total++; input.coverage.outbox.observedCount++;
  input.coverage.outbox.protectedCount = 1; input.coverage.outbox.pagesRead.push(3);
  assert.equal(ledger(input).inventory.coverage.outbox.protectedCount, 1);
  input.items[0].episodeNo = 7;
  assert.throws(() => ledger(input), /protected_episode/);
});
test("rejects sender/audience/subject/status/timezone/time and campaign identity drift", () => {
  for (const [key, value] of [["sender","Other (bad@example.com)"], ["audience","Other (1)"],
    ["subject","wrong"], ["status","draft"], ["scheduledAt","2026-10-05T01:00:00Z"],
    ["scheduledAt","2026-10-05T10:00:00+08:00"]]) {
    const input = inventory(); input.items[0].readback[key] = value;
    assert.throws(() => ledger(input), /inventory_readback_failed/);
  }
  const input = inventory(); input.items[0].campaignUrl = "https://dashboard.mailerlite.com/campaigns/999/review";
  assert.throws(() => ledger(input), /not_same_campaign/);
});
test("fresh inventory, fresh readback and browser readiness cannot be bypassed", () => {
  for (const mutate of [i => i.observedAt = new Date(now-1800001).toISOString(),
    i => i.items[0].readback.readbackAt = new Date(now-1800001).toISOString(), i => i.browserReady = false]) {
    const input = inventory(); mutate(input); assert.throws(() => ledger(input));
  }
  assert.throws(() => planSlots(ledger(), now+1800001), /fresh_provider/);
  assert.throws(() => planSlots({ version: 1, authority: "hermes" }, now), /authority/);
});
test("duplicates by episode OR weekly date block every creation", () => {
  const input = inventory(); input.items.push({ ...input.items[0], campaignId: "999", campaignUrl: "https://dashboard.mailerlite.com/campaigns/999/review" });
  Object.assign(input.coverage.outbox, { total: 5, observedCount: 5, pagesRead: [1,2,3] });
  assert.throws(() => planSlots(ledger(input), now), /duplicate/);
  const value = gapLedger(); value.inventory.items = [{ episodeNo: 60, date: slots[0].date, status: "ready", campaignId: "999" }];
  assert.throws(() => planSlots(value, now), /identity_mismatch/);
});
test("Sent skips, Ready is protected, only correct Draft is adopted", () => {
  const value = gapLedger();
  value.inventory.items = slots.map((s,i) => ({ ...s, status: ["sent","ready","draft","draft"][i],
    correctDraft: i === 2, campaignId: `${i+1}` }));
  assert.deepEqual(planSlots(value, now).map(s => s.decision), ["existing_sent","protected_ready","adopt_draft","blocked_draft"]);
});
test("pilot reservation prevents later gaps; unknown results block all retries", () => {
  const value = gapLedger(); value.jobs[slots[0].date] = { status:"reserved", date:slots[0].date };
  assert.throws(() => requireGap(value, 13, slots[1].date, now), /pilot/);
  assert.equal(requireGap(value, 12, slots[0].date, now).decision, "gap");
  value.jobs[slots[0].date].status = "attempted_unknown";
  assert.throws(() => planSlots(value, now), /unreconciled/);
  value.jobs[slots[0].date].status = "unrecognized";
  assert.throws(() => planSlots(value, now), /unreconciled/);
});
test("sanitization discards secrets and individual subscriber records", () => {
  const input = inventory(); input.token = "SECRET"; input.items[0].cookie = "SECRET";
  input.subscribers = [{ email:"SECRET" }];
  assert.ok(!JSON.stringify(ledger(input)).includes("SECRET"));
});
test("persistent lock rejects simultaneous or stale owners; atomic ledger roundtrip", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "koko-lock-"));
  try {
    const release = await acquireRunLock(root, "koko");
    await assert.rejects(acquireRunLock(root, "koko"), /locked_fail_closed/);
    await writeLedger(root, ledger()); assert.deepEqual(await readLedger(root), ledger());
    await release();
    await fs.writeFile(path.join(root,"content/newsletters/koko-runner.lock"), "stale");
    await assert.rejects(acquireRunLock(root,"koko"), /locked_fail_closed/);
  } finally { await fs.rm(root, { recursive: true }); }
});

test("runner prepare is idempotent, ignores inflated sent history, never writes state", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "koko-runner-"));
  const runner = fileURLToPath(new URL("./newsletter-runner.mjs", import.meta.url));
  const liveSlots = rollingSlots();
  const current = { version:1, authority:"codex", jobs:{}, inventory:{ ...gapLedger().inventory,
    observedAt:new Date().toISOString() } };
  const state = { channels:{ koko:{ lastSentEpisodeNo:51, episodes:liveSlots.map(s => ({
    episodeNo:s.episodeNo, videoId:`video${s.episodeNo}`, videoUrl:`https://youtu.be/video${s.episodeNo}`,
    title:"Safe source", sentAt:"2026-08-30T00:00:00Z" })) } }, runs:[] };
  const call = (...args) => spawnSync(process.execPath, [runner,"--channel","koko",...args],
    { cwd:root, encoding:"utf8", timeout:10000 });
  try {
    await writeLedger(root,current);
    const stateFile = path.join(root,"content/newsletters/state.json");
    await fs.writeFile(stateFile,JSON.stringify(state));
    const before = await fs.readFile(stateFile,"utf8");
    const first = call("--mode","prepare"); assert.equal(first.status,0,first.stderr+first.stdout);
    const result = JSON.parse(first.stdout);
    assert.equal(result.episodeNo,liveSlots[0].episodeNo);
    assert.match(result.status,/prepared/); assert.ok(result.requestPath);
    const second = call("--mode","prepare"); assert.equal(second.status,0,second.stderr);
    assert.equal(JSON.parse(second.stdout).requestPath,result.requestPath);
    assert.equal((await fs.readdir(path.join(root,"content/newsletters/pending"))).length,1);
    for (const args of [["--mode","legacy"],["--mode","typo-mode"],["--mode","prepare","--sync-only"],["--mode","send"],
      ["--mode","chrome-result","--browser-status","scheduled"],
      ["--mode","api-preflight","--delivery","instant"]]) {
      assert.notEqual(call(...args).status,0);
    }
    assert.equal(await fs.readFile(stateFile,"utf8"),before);
    current.jobs[liveSlots[0].date] = { status:"reserved", episodeNo:liveSlots[0].episodeNo, date:liveSlots[0].date };
    await writeLedger(root,current);
    const attempted = call("--mode","mutation-start","--schedule-date",liveSlots[0].date);
    assert.equal(attempted.status,0,attempted.stderr);
    assert.equal((await readLedger(root)).jobs[liveSlots[0].date].status,"attempted_unknown");
    const bindArgs = ["--mode","mutation-bind","--schedule-date",liveSlots[0].date,"--campaign-id","500",
      "--campaign-url","https://dashboard.mailerlite.com/campaigns/500/review"];
    assert.equal(call(...bindArgs).status,0);
    assert.notEqual(call(...bindArgs,"--campaign-id","999","--campaign-url","https://dashboard.mailerlite.com/campaigns/999/review").status,0);
    assert.equal((await readLedger(root)).jobs[liveSlots[0].date].campaignId,"500");
    assert.notEqual(call("--mode","mutation-start","--schedule-date",liveSlots[0].date).status,0);
    assert.notEqual(call("--mode","prepare").status,0);
    assert.equal(await fs.readFile(stateFile,"utf8"),before);
  } finally { await fs.rm(root,{recursive:true}); }
});

test("state contract checker excludes protected corrupt artifacts before opening them", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(),"koko-contract-"));
  try {
    for (const dir of ["pending","runs","browser-handoff"]) await fs.mkdir(path.join(root,"content/newsletters",dir),{recursive:true});
    await fs.writeFile(path.join(root,"content/newsletters/state.json"),JSON.stringify({ version:1,
      channels:Object.fromEntries(["koko","arabic"].map(c => [c,{lastSentEpisodeNo:0,episodes:[]}])) }));
    await fs.writeFile(path.join(root,"content/newsletters/pending/x-koko-ep007.newsletter.json"),"INVALID JSON DO NOT OPEN");
    const checker = fileURLToPath(new URL("./check-newsletter-state-contract.mjs",import.meta.url));
    const result = spawnSync(process.execPath,[checker,"--out-dir",path.join(root,"report")],{cwd:root,encoding:"utf8",timeout:10000});
    assert.equal(result.status,0,result.stdout+result.stderr);
    assert.doesNotMatch(result.stdout,/invalid_json/);
  } finally { await fs.rm(root,{recursive:true}); }
});

test("partial or wrong-object readback leaves unknown; complete readback never marks sent", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(),"koko-readback-"));
  const runner = fileURLToPath(new URL("./newsletter-runner.mjs",import.meta.url));
  const slot = rollingSlots()[0], inputPath = `content/newsletters/pending/test-koko-ep${String(slot.episodeNo).padStart(3,"0")}.newsletter.json`;
  const source = { episodeNo:slot.episodeNo, videoId:"video1234", subject:"A safe source subject", preview_text:"Safe preview text",
    hero_title:"Safe story title", intro:"Safe English story introduction", parent_activity:"家長一起練習 Safe activity",
    video_cta:"Watch this video", site_cta:"Visit our site", closing:"Enjoy learning together",
    learning_words:[1,2,3].map(i => ({term:`word${i}`,pronunciation:"word",meaning:"學習",example:"A safe example"})) };
  const state = JSON.stringify({channels:{koko:{lastSentEpisodeNo:51,episodes:[{episodeNo:slot.episodeNo,
    videoId:source.videoId, videoUrl:"https://www.youtube.com/watch?v=video1234",title:"Source story"}]}},runs:[]});
  const value = gapLedger(); value.inventory.observedAt = new Date().toISOString();
  value.jobs[slot.date] = {status:"attempted_unknown",episodeNo:slot.episodeNo,date:slot.date,campaignId:"100",
    inputPath, inputDigest:createHash("sha256").update(JSON.stringify(source)).digest("hex")};
  const fields = ["--mode","chrome-result","--readback-only","--browser-status","scheduled","--input",inputPath,
    "--campaign-id","100","--campaign-url","https://dashboard.mailerlite.com/campaigns/100/review",
    "--schedule-date",slot.date,"--schedule-time","09:00","--provider-status","scheduled",
    "--provider-scheduled-at",slot.scheduledAt,"--provider-sender","Fursay (hello@fursay.com)",
    "--provider-audience","KOKO subscribers (1)","--provider-subject",source.subject];
  const call = args => spawnSync(process.execPath,[runner,"--channel","koko",...args],{cwd:root,encoding:"utf8",timeout:10000});
  try {
    await writeLedger(root,value);
    await fs.mkdir(path.dirname(path.join(root,inputPath)),{recursive:true});
    await fs.writeFile(path.join(root,inputPath),JSON.stringify(source));
    const stateFile = path.join(root,"content/newsletters/state.json"); await fs.writeFile(stateFile,state);
    await fs.mkdir(path.join(root,"fursay-optimized-site"),{recursive:true});
    // Unit fixture only: source-only candidates deliberately omit release-generated creator-kit.json.
    const pack = {sampleShortlink:"https://fursay.com/go/koko-sample", trackedLandingUrl:"https://fursay.com/koko?utm_source=creator_kit",
      qrSvg:"/images/qr/koko.svg", youtubeDescription:"A safe source story", socialCaption:"A safe family activity",
      newsletterBlurb:"Enjoy a calm family story: https://fursay.com/go/koko-newsletter",
      placementLinks:{newsletterBlurb:{shortlink:"https://fursay.com/go/koko-newsletter"}}};
    await fs.writeFile(path.join(root,"fursay-optimized-site/creator-kit.json"),JSON.stringify({packs:{koko:pack}}));
    assert.notEqual(call(fields).status,0); // body QA/mutation count is missing
    assert.equal((await readLedger(root)).jobs[slot.date].status,"attempted_unknown");
    const wrong = [...fields,"--provider-content-verified","--mutation-count","2","--campaign-url","https://dashboard.mailerlite.com/campaigns/999/review"];
    assert.notEqual(call(wrong).status,0);
    assert.equal((await readLedger(root)).jobs[slot.date].status,"attempted_unknown");
    const result = call([...fields,"--provider-content-verified","--mutation-count","2"]);
    assert.equal(result.status,0,result.stdout+result.stderr);
    const record = JSON.parse(result.stdout);
    assert.equal(record.status,"readback_verified");
    assert.equal((await readLedger(root)).jobs[slot.date].status,"scheduled_verified");
    assert.equal((await readLedger(root)).jobs[slot.date].providerMutationCount,2);
    assert.equal(await fs.readFile(stateFile,"utf8"),state);
    assert.equal(record.retryCommand,null);
    assert.notEqual(call([...fields,"--provider-content-verified","--mutation-count","2"]).status,0); // never clears/resubmits same job again
    assert.equal(call(fields).status,0); // a scheduled campaign may be freshly reread without a new mutation
    assert.equal((await readLedger(root)).jobs[slot.date].providerMutationCount,2); // historical count is not erased
  } finally { await fs.rm(root,{recursive:true}); }
});
