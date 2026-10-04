import assert from "node:assert/strict";
import test from "node:test";
import { validateProviderReadback } from "./newsletter-readback-contract.mjs";

const now = Date.parse("2026-09-25T05:00:00+08:00");
const valid = {
  campaignId: "cmp-123",
  campaignUrl: "https://dashboard.mailerlite.com/campaigns/cmp-123/review",
  providerStatus: "scheduled",
  providerScheduledAt: "2026-09-28 09:00:00 (+08:00)",
  expectedScheduledAt: "2026-09-28T09:00:00+08:00",
  providerSender: "Fursay (hello@fursay.com)",
  expectedSender: { name: "Fursay", email: "hello@fursay.com" },
  providerAudience: "Koko 電子報訂閱者 (2)",
  expectedAudienceGroup: "Koko 電子報訂閱者",
  providerSubject: "A source-verified subject",
  expectedSubject: "A source-verified subject"
};

test("accepts a complete, future, same-campaign provider readback", () => {
  assert.deepEqual(validateProviderReadback(valid, now), []);
});

test("accepts the MailerLite editor URL when it identifies the same campaign ID", () => {
  assert.deepEqual(validateProviderReadback({
    ...valid,
    campaignUrl: "https://dashboard.mailerlite.com/emails/cmp-123/edit"
  }, now), []);
});

test("rejects a campaign URL that points to a different campaign ID", () => {
  const errors = validateProviderReadback({ ...valid, campaignUrl: "https://dashboard.mailerlite.com/campaigns/other/review" }, now);
  assert.ok(errors.includes("campaign_url_not_same_campaign"));
});

test("rejects non-scheduled provider state", () => {
  const errors = validateProviderReadback({ ...valid, providerStatus: "draft" }, now);
  assert.ok(errors.includes("provider_status_not_scheduled"));
});

test("rejects missing timezone and mismatched schedule time", () => {
  const missingZone = validateProviderReadback({ ...valid, providerScheduledAt: "2026-09-28 09:00:00" }, now);
  assert.ok(missingZone.includes("provider_schedule_invalid_or_timezone_missing"));
  const mismatch = validateProviderReadback({ ...valid, providerScheduledAt: "2026-09-28 10:00:00 (+08:00)" }, now);
  assert.ok(mismatch.includes("provider_schedule_mismatch"));
});

test("rejects impossible calendar dates and timezone offsets", () => {
  const invalidDate = validateProviderReadback({ ...valid, providerScheduledAt: "2026-02-30T09:00:00+08:00" }, now);
  assert.ok(invalidDate.includes("provider_schedule_invalid_or_timezone_missing"));
  const invalidOffset = validateProviderReadback({ ...valid, providerScheduledAt: "2026-09-28T09:00:00+14:01" }, now);
  assert.ok(invalidOffset.includes("provider_schedule_invalid_or_timezone_missing"));
});

test("rejects past schedules", () => {
  const errors = validateProviderReadback({
    ...valid,
    providerScheduledAt: "2026-09-24 09:00:00 (+08:00)",
    expectedScheduledAt: "2026-09-24T09:00:00+08:00"
  }, now);
  assert.ok(errors.includes("scheduled_time_not_future"));
});

test("rejects sender name or mailbox drift", () => {
  const errors = validateProviderReadback({ ...valid, providerSender: "Other (other@example.com)" }, now);
  assert.ok(errors.includes("provider_sender_mismatch"));
});

test("rejects wrong audience and empty active group", () => {
  const wrongGroup = validateProviderReadback({ ...valid, providerAudience: "Other group (2)" }, now);
  assert.ok(wrongGroup.includes("provider_audience_mismatch"));
  const empty = validateProviderReadback({ ...valid, providerAudience: "Koko 電子報訂閱者 (0)" }, now);
  assert.ok(empty.includes("provider_audience_empty"));
});

test("rejects subject drift", () => {
  const errors = validateProviderReadback({ ...valid, providerSubject: "Different subject" }, now);
  assert.ok(errors.includes("provider_subject_mismatch"));
});

test("rejects insecure and non-MailerLite campaign URLs", () => {
  const insecure = validateProviderReadback({ ...valid, campaignUrl: "http://dashboard.mailerlite.com/campaigns/cmp-123/review" }, now);
  assert.ok(insecure.includes("campaign_url_not_same_campaign"));
  const external = validateProviderReadback({ ...valid, campaignUrl: "https://example.com/campaigns/cmp-123/review" }, now);
  assert.ok(external.includes("campaign_url_not_same_campaign"));
  const lookalikeSubdomain = validateProviderReadback({ ...valid, campaignUrl: "https://attacker.mailerlite.com/campaigns/cmp-123/review" }, now);
  assert.ok(lookalikeSubdomain.includes("campaign_url_not_same_campaign"));
  const differentEditorObject = validateProviderReadback({ ...valid, campaignUrl: "https://dashboard.mailerlite.com/emails/other-id/edit" }, now);
  assert.ok(differentEditorObject.includes("campaign_url_not_same_campaign"));
});
