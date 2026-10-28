function normalizedText(value) {
  return String(value ?? "").normalize("NFKC").trim().replace(/\s+/gu, " ");
}

function parseZonedInstant(value) {
  const input = String(value ?? "").trim();
  const display = input.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})\s+\((?:(?:GMT|UTC)\s*)?([+-]\d{2}:\d{2})\)$/i);
  const normalized = display ? `${display[1]}T${display[2]}${display[3]}` : input;
  const parts = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|([+-])(\d{2}):(\d{2}))$/i);
  if (!parts) return null;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, zone, , offsetHourText, offsetMinuteText] = parts;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const daysInMonth = [31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1970 || month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]
      || hour > 23 || minute > 59 || second > 59) return null;
  if (zone.toUpperCase() !== "Z") {
    const offsetHours = Number(offsetHourText);
    const offsetMinutes = Number(offsetMinuteText);
    if (offsetHours > 14 || offsetMinutes > 59 || (offsetHours === 14 && offsetMinutes !== 0)) return null;
  }
  const epoch = Date.parse(normalized);
  return Number.isFinite(epoch) ? epoch : null;
}

function parseSender(value) {
  const match = String(value ?? "").trim().match(/^(.+?)\s*(?:\(([^()<>]+)\)|<([^<>]+)>)$/u);
  if (!match) return null;
  return {
    name: normalizedText(match[1]),
    email: normalizedText(match[2] || match[3]).toLowerCase()
  };
}

function parseAudience(value) {
  const match = String(value ?? "").trim().match(/^(.+?)\s+\(\s*(\d+)(?:\s+active)?\s*\)$/iu);
  if (!match) return null;
  return { groupName: normalizedText(match[1]), activeCount: Number(match[2]) };
}

function campaignUrlMatchesId(value, campaignId) {
  try {
    const url = new URL(String(value));
    if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "dashboard.mailerlite.com") return false;
    const parts = url.pathname.split("/").filter(Boolean).map((part) => decodeURIComponent(part));
    const exactId = String(campaignId);
    if (parts[0] === "campaigns" && parts[1] === exactId) return true;
    return parts[0] === "emails" && parts[1] === exactId
      && (parts.length === 2 || (parts.length === 3 && parts[2] === "edit"));
  } catch {
    return false;
  }
}

export function validateProviderReadback(input, nowEpoch = Date.now()) {
  const errors = [];
  const campaignId = String(input.campaignId ?? "").trim();
  if (!campaignId) errors.push("campaign_id_missing");
  if (!campaignUrlMatchesId(input.campaignUrl, campaignId)) errors.push("campaign_url_not_same_campaign");
  if (input.providerStatus !== "scheduled") errors.push("provider_status_not_scheduled");

  const expectedEpoch = parseZonedInstant(input.expectedScheduledAt);
  const providerEpoch = parseZonedInstant(input.providerScheduledAt);
  if (expectedEpoch === null) errors.push("expected_schedule_invalid_or_timezone_missing");
  if (providerEpoch === null) errors.push("provider_schedule_invalid_or_timezone_missing");
  if (expectedEpoch !== null && providerEpoch !== null && providerEpoch !== expectedEpoch) {
    errors.push("provider_schedule_mismatch");
  }
  if (expectedEpoch !== null && expectedEpoch <= nowEpoch) errors.push("scheduled_time_not_future");

  const expectedSender = {
    name: normalizedText(input.expectedSender?.name),
    email: normalizedText(input.expectedSender?.email).toLowerCase()
  };
  const providerSender = parseSender(input.providerSender);
  if (!expectedSender.name || !expectedSender.email || !providerSender
      || providerSender.name !== expectedSender.name || providerSender.email !== expectedSender.email) {
    errors.push("provider_sender_mismatch");
  }

  const expectedGroup = normalizedText(input.expectedAudienceGroup);
  const providerAudience = parseAudience(input.providerAudience);
  if (!providerAudience || providerAudience.groupName !== expectedGroup) {
    errors.push("provider_audience_mismatch");
  }
  if (providerAudience && providerAudience.activeCount <= 0) errors.push("provider_audience_empty");

  if (!normalizedText(input.expectedSubject)
      || normalizedText(input.providerSubject) !== normalizedText(input.expectedSubject)) {
    errors.push("provider_subject_mismatch");
  }
  return errors;
}
