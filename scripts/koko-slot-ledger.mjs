import fs from "node:fs/promises";
import path from "node:path";
import { validateProviderReadback } from "./newsletter-readback-contract.mjs";

export const LEDGER_RELATIVE = "content/newsletters/koko-slot-ledger.json";
const WEEK = 7 * 86400000;
const ANCHOR = Date.parse("2026-09-07T09:00:00+08:00");
const TTL = 30 * 60000;

export function assertAllowedEpisode(channel, episodeNo, inputPath = "") {
  if ((channel === "koko" || /koko/i.test(inputPath))
      && (Number(episodeNo) === 7 || /(?:^|[^a-z0-9])ep0*7(?:[^0-9]|$)/i.test(inputPath))) {
    throw new Error("protected_episode_ep007");
  }
}

export function rollingSlots(now = Date.now()) {
  let first = ANCHOR + Math.max(0, Math.floor((now - ANCHOR) / WEEK) + 1) * WEEK;
  return Array.from({ length: 4 }, (_, i) => {
    const epoch = first + i * WEEK;
    const date = new Date(epoch + 8 * 3600000).toISOString().slice(0, 10);
    return { episodeNo: 8 + (epoch - ANCHOR) / WEEK, date, scheduledAt: `${date}T09:00:00+08:00` };
  });
}

function fresh(value, now) {
  const epoch = Date.parse(value);
  return Number.isFinite(epoch) && epoch <= now && now - epoch <= TTL;
}

// Only explicitly enumerated aggregate/provider fields survive into durable state.
export function sanitizeInventory(input, subjects, now = Date.now()) {
  if (!fresh(input.observedAt, now)) throw new Error("inventory_timestamp_stale_or_invalid");
  if (input.channel !== "koko" || input.browserReady !== true || !String(input.tabId || "")) {
    throw new Error("inventory_browser_target_missing");
  }
  for (const name of ["outbox", "sent", "drafts"]) {
    const c = input.coverage?.[name];
    if (!c || !Number.isInteger(c.total) || c.total < 0 || !Number.isInteger(c.pageSize) || c.pageSize <= 0
        || !Array.isArray(c.pagesRead) || c.pagesRead.length !== Math.max(1, Math.ceil(c.total / c.pageSize))
        || c.pagesRead.some((n, i) => n !== i + 1)
        || c.observedCount !== c.total
        || !Number.isInteger(c.otherChannelCount) || c.otherChannelCount < 0
        || !Number.isInteger(c.protectedCount) || c.protectedCount < 0
        || input.items?.filter(r => r.section === name).length + c.otherChannelCount + c.protectedCount !== c.total) {
      throw new Error(`inventory_incomplete_${name}`);
    }
  }
  if (!Array.isArray(input.items)) throw new Error("inventory_items_missing");
  const ids = new Set();
  const items = input.items.map(item => {
    assertAllowedEpisode("koko", item.episodeNo);
    if (!Number.isInteger(item.episodeNo) || item.episodeNo < 8 || !/^\d+$/.test(String(item.campaignId))) {
      throw new Error("inventory_identity_invalid");
    }
    if (ids.has(String(item.campaignId))) throw new Error("inventory_duplicate_campaign_id");
    ids.add(String(item.campaignId));
    const url = new URL(item.campaignUrl);
    if (url.href !== `https://dashboard.mailerlite.com/campaigns/${item.campaignId}/review`) {
      throw new Error("inventory_url_not_same_campaign");
    }
    if (!["sent", "scheduled", "ready", "draft", "attempted_unknown"].includes(item.status)) {
      throw new Error("inventory_status_invalid");
    }
    if (!({ outbox: ["scheduled", "ready", "attempted_unknown"], sent: ["sent"],
      drafts: ["draft", "attempted_unknown"] }[item.section]?.includes(item.status))) {
      throw new Error("inventory_section_status_mismatch");
    }
    const row = { episodeNo: item.episodeNo, campaignId: String(item.campaignId), campaignUrl: url.href,
      section: item.section, status: item.status, date: item.date || null, correctDraft: item.correctDraft === true };
    const slot = rollingSlots(now).find(s => s.episodeNo === item.episodeNo || s.date === item.date);
    if (item.status === "scheduled" && slot) {
      const r = item.readback || {};
      const errors = validateProviderReadback({ campaignId: row.campaignId, campaignUrl: row.campaignUrl,
        providerStatus: r.status, providerScheduledAt: r.scheduledAt,
        expectedScheduledAt: slot.scheduledAt, providerSender: r.sender,
        expectedSender: { name: "Fursay", email: "hello@fursay.com" },
        providerAudience: r.audience, expectedAudienceGroup: "Koko 電子報訂閱者",
        providerSubject: r.subject, expectedSubject: subjects[item.episodeNo] }, now);
      if (slot.episodeNo !== item.episodeNo || !fresh(r.readbackAt, now)
          || !String(r.scheduledAt).includes("+08:00") || errors.length) {
        throw new Error(`inventory_readback_failed:${errors.join(",") || "episode_or_readback_time"}`);
      }
      row.date = slot.date;
      row.readback = { status: "scheduled", scheduledAt: slot.scheduledAt, sender: r.sender,
        audience: r.audience, subject: r.subject, readbackAt: r.readbackAt,
        contentVerified: r.contentVerified === true };
    }
    return row;
  });
  return { observedAt: input.observedAt, tabId: String(input.tabId), browserReady: true,
    coverage: Object.fromEntries(["outbox", "sent", "drafts"].map(k => [k, {
      total: input.coverage[k].total, pageSize: input.coverage[k].pageSize,
      pagesRead: input.coverage[k].pagesRead, observedCount: input.coverage[k].observedCount,
      otherChannelCount: input.coverage[k].otherChannelCount, protectedCount: input.coverage[k].protectedCount }])), items };
}

export function planSlots(ledger, now = Date.now()) {
  if (ledger?.version !== 1 || ledger?.authority !== "codex") throw new Error("ledger_authority_or_version_invalid");
  if (!ledger?.inventory || !fresh(ledger.inventory.observedAt, now)) throw new Error("fresh_provider_inventory_required");
  if (Object.values(ledger.jobs || {}).some(j => !["reserved", "scheduled_verified"].includes(j.status))) {
    throw new Error("unreconciled_job_fail_closed");
  }
  const items = ledger.inventory.items;
  return rollingSlots(now).map(slot => {
    const matches = items.filter(r => r.episodeNo === slot.episodeNo || r.date === slot.date);
    if (matches.length > 1) throw new Error("duplicate_episode_or_slot_fail_closed");
    const item = matches[0];
    if (!item) return { ...slot, decision: "gap" };
    if (item.episodeNo !== slot.episodeNo || (item.date && item.date !== slot.date)) {
      throw new Error("episode_slot_identity_mismatch");
    }
    if (item.status === "attempted_unknown") throw new Error("provider_unknown_fail_closed");
    if (item.status === "scheduled" && (!item.readback || !fresh(item.readback.readbackAt, now))) {
      throw new Error("fresh_same_object_readback_required");
    }
    const decision = { scheduled: "existing_scheduled", sent: "existing_sent", ready: "protected_ready",
      draft: item.correctDraft ? "adopt_draft" : "blocked_draft" }[item.status];
    return { ...slot, decision, campaignId: item.campaignId, campaignUrl: item.campaignUrl };
  });
}

export function requireGap(ledger, episodeNo, date, now = Date.now()) {
  assertAllowedEpisode("koko", episodeNo);
  const slots = planSlots(ledger, now);
  if (slots.some(s => s.decision === "blocked_draft")) throw new Error("draft_qa_blocked_stop_batch");
  const slot = slots.find(s => s.episodeNo === Number(episodeNo) && s.date === date);
  if (!slot || !["gap", "adopt_draft"].includes(slot.decision)) throw new Error("slot_not_a_verified_gap");
  const sameJob = ledger.jobs?.[date];
  if (sameJob && sameJob.status !== "reserved") throw new Error("previous_job_not_a_new_gap");
  const pending = Object.values(ledger.jobs || {}).find(j => j.status === "reserved" && j.date !== date);
  if (pending) throw new Error("pilot_not_completed");
  return slot;
}

export async function readLedger(root) {
  try { return JSON.parse(await fs.readFile(path.join(root, LEDGER_RELATIVE), "utf8")); }
  catch (error) { if (error.code !== "ENOENT") throw error; return { version: 1, authority: "codex", jobs: {} }; }
}

export async function writeLedger(root, ledger) {
  const target = path.join(root, LEDGER_RELATIVE);
  await fs.mkdir(path.dirname(target), { recursive: true });
  const temp = `${target}.tmp-${process.pid}`;
  const handle = await fs.open(temp, "wx", 0o600);
  try { await handle.writeFile(JSON.stringify(ledger, null, 2) + "\n"); await handle.sync(); }
  finally { await handle.close(); }
  await fs.rename(temp, target);
  const directory = await fs.open(path.dirname(target), "r");
  try { await directory.sync(); } finally { await directory.close(); }
}

export async function acquireRunLock(root, channel) {
  const lock = path.join(root, "content/newsletters", `${channel}-runner.lock`);
  await fs.mkdir(path.dirname(lock), { recursive: true });
  const handle = await fs.open(lock, "wx", 0o600).catch(error => {
    if (error.code === "EEXIST") throw new Error("newsletter_run_locked_fail_closed");
    throw error;
  });
  await handle.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
  await handle.sync();
  return async () => { await handle.close(); await fs.unlink(lock); };
}
