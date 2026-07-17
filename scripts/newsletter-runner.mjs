#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const STATE_PATH = path.join(ROOT, "content", "newsletters", "state.json");
const RUNS_DIR = path.join(ROOT, "content", "newsletters", "runs");
const PENDING_DIR = path.join(ROOT, "content", "newsletters", "pending");
const BROWSER_HANDOFF_DIR = path.join(ROOT, "content", "newsletters", "browser-handoff");
const CREATOR_KIT_PATH = path.join(ROOT, "fursay-optimized-site", "creator-kit.json");
const YOUTUBE_API = "https://www.googleapis.com/youtube/v3/playlistItems";
const OPENAI_API = "https://api.openai.com/v1/responses";
const MAILERLITE_API = "https://connect.mailerlite.com/api";
const BLOCKED_COPY_PATTERN = /add your company postal address here|postal address here|lorem ipsum|placeholder|TODO/i;
const CREATOR_PACK_BY_CHANNEL = {
  koko: "koko",
  arabic: "noor"
};

function projectPath(filePath) {
  return path.relative(ROOT, filePath).replaceAll(path.sep, "/");
}

const CHANNELS = {
  koko: {
    label: "Koko's Forest",
    groupEnv: "MAILERLITE_GROUP_KOKO",
    uploadPlaylistId: "UU0X4CIwf6KoUMoIHwRxN3jw",
    youtubeUrl: "https://www.youtube.com/@KokosForest",
    siteUrl: "https://fursay.com/koko",
    sendWeekday: "Monday",
    languageBrief: "English newsletter with Traditional Chinese parent support",
    audience: "families using Koko's Forest for gentle English learning",
    contentRules: [
      "Use warm, clear English as the main language.",
      "Include Traditional Chinese parent guidance after the English learning content.",
      "Keep the tone playful, calm, and practical for parents of young children.",
      "Do not claim the video is new unless the source metadata explicitly says so."
    ]
  },
  arabic: {
    label: "Arabic Kids Chinese",
    groupEnv: "MAILERLITE_GROUP_NOOR",
    uploadPlaylistId: "UUOxmnonpfBvpiV8Vg5LEiYw",
    youtubeUrl: "https://www.youtube.com/@ArabicKidsChinese",
    siteUrl: "https://fursay.com/arabic",
    sendWeekday: "Wednesday",
    languageBrief: "Arabic newsletter with Chinese and Pinyin learning support",
    audience: "Arabic-speaking families learning Chinese through picture-book stories",
    contentRules: [
      "Use Arabic as the main language.",
      "Include a clear Chinese phrase section with Pinyin and short meaning.",
      "Use right-to-left friendly wording and avoid mixing long English passages into Arabic sections.",
      "Do not claim the video is new unless the source metadata explicitly says so."
    ]
  }
};

function parseArgs(argv) {
  const args = { dryRun: false, syncOnly: false, mode: "legacy", delivery: "scheduled" };
  for (let i = 2; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === "--channel") args.channel = argv[++i];
    else if (item === "--mode") args.mode = argv[++i];
    else if (item === "--input") args.input = argv[++i];
    else if (item === "--schedule-date") args.scheduleDate = argv[++i];
    else if (item === "--schedule-time") args.scheduleTime = argv[++i];
    else if (item === "--delivery") args.delivery = argv[++i];
    else if (item === "--browser-status") args.browserStatus = argv[++i];
    else if (item === "--campaign-id") args.campaignId = argv[++i];
    else if (item === "--campaign-url") args.campaignUrl = argv[++i];
    else if (item === "--failure-code") args.failureCode = argv[++i];
    else if (item === "--failure-detail") args.failureDetail = argv[++i];
    else if (item === "--handoff") args.handoff = argv[++i];
    else if (item === "--dry-run") args.dryRun = true;
    else if (item === "--sync-only") args.syncOnly = true;
    else if (item === "--help" || item === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${item}`);
  }
  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/newsletter-runner.mjs --mode prepare --channel koko
  node scripts/newsletter-runner.mjs --mode api-preflight --channel koko
  node scripts/newsletter-runner.mjs --mode send --channel koko --input content/newsletters/pending/<file>.newsletter.json
  node scripts/newsletter-runner.mjs --mode chrome-handoff --channel koko --input content/newsletters/pending/<file>.newsletter.json
  node scripts/newsletter-runner.mjs --mode chrome-result --channel koko --input content/newsletters/pending/<file>.newsletter.json --browser-status scheduled --campaign-url <outbox-or-campaign-url>
  node scripts/newsletter-runner.mjs --mode chrome-result --channel koko --input content/newsletters/pending/<file>.newsletter.json --browser-status failed --failure-code login_required --failure-detail "MailerLite asked for login"
  node scripts/newsletter-runner.mjs --mode send --channel arabic --input content/newsletters/pending/<file>.newsletter.json --schedule-date 2026-06-03 --schedule-time 09:00

Legacy OpenAI API mode:
  node scripts/newsletter-runner.mjs --channel koko
  node scripts/newsletter-runner.mjs --channel arabic
  node scripts/newsletter-runner.mjs --channel koko --dry-run
  node scripts/newsletter-runner.mjs --channel arabic --sync-only
`);
}

async function loadDotEnv() {
  const envPath = path.join(ROOT, ".env");
  try {
    const text = await fs.readFile(envPath, "utf8");
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function readState() {
  try {
    return JSON.parse(await fs.readFile(STATE_PATH, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return {
      version: 1,
      channels: {
        koko: { lastSentEpisodeNo: 0, episodes: [] },
        arabic: { lastSentEpisodeNo: 0, episodes: [] }
      },
      runs: []
    };
  }
}

async function writeState(state) {
  await fs.mkdir(path.dirname(STATE_PATH), { recursive: true });
  await fs.writeFile(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function optionalEnv(name) {
  return process.env[name] || "";
}

function envFlag(name) {
  return /^(1|true|yes|on)$/i.test(optionalEnv(name));
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }
  if (!response.ok) {
    const detail = data?.error?.message || data?.message || text || response.statusText;
    throw new Error(`HTTP ${response.status}: ${detail}`);
  }
  return data;
}

function mailerLiteHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json"
  };
}

function classifyMailerLiteError(error) {
  const message = String(error?.message || error || "");
  if (/401|Unauthenticated|API-Key Unauthorized|Unauthorized/i.test(message)) return "auth";
  if (/403|Forbidden/i.test(message)) return "forbidden";
  if (/Content submission is only available on advanced plan|Advanced plan/i.test(message)) return "advanced_plan_required";
  if (/valid email address|verified on MailerLite|from field/i.test(message)) return "sender_verification";
  if (/group|groups/i.test(message) && /invalid|valid|required|belonging/i.test(message)) return "group_configuration";
  if (/429|Too Many Attempts|rate limit/i.test(message)) return "rate_limited";
  if (/422|validation|invalid|given data/i.test(message)) return "validation";
  return "unknown";
}

function extractEpisodeNo(text) {
  const match = String(text || "").match(/\b(?:ep|episode|第)\s*0*(\d{1,4})\b/i);
  return match ? Number(match[1]) : null;
}

function normalizeEpisode(item, fallbackNo) {
  const snippet = item.snippet || {};
  const videoId = item.contentDetails?.videoId || snippet.resourceId?.videoId;
  const title = snippet.title || "";
  const description = snippet.description || "";
  const parsedNo = extractEpisodeNo(`${title}\n${description}`);
  return {
    episodeNo: parsedNo || fallbackNo,
    videoId,
    title,
    description,
    thumbnail: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || "",
    publishedAt: item.contentDetails?.videoPublishedAt || snippet.publishedAt || "",
    videoUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : "",
    source: parsedNo ? "parsed" : "published_order"
  };
}

async function syncEpisodes(channelKey, state) {
  const apiKey = requireEnv("YOUTUBE_API_KEY");
  const config = CHANNELS[channelKey];
  const items = [];
  let pageToken = "";

  do {
    const url = new URL(YOUTUBE_API);
    url.searchParams.set("part", "snippet,contentDetails");
    url.searchParams.set("playlistId", config.uploadPlaylistId);
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("key", apiKey);
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const data = await fetchJson(url);
    items.push(...(data.items || []));
    pageToken = data.nextPageToken || "";
  } while (pageToken);

  const oldToNew = items
    .filter((item) => {
      const title = item.snippet?.title || "";
      return item.snippet?.resourceId?.videoId || item.contentDetails?.videoId || !/deleted video|private video/i.test(title);
    })
    .sort((a, b) => new Date(a.contentDetails?.videoPublishedAt || a.snippet?.publishedAt || 0) - new Date(b.contentDetails?.videoPublishedAt || b.snippet?.publishedAt || 0));

  const episodes = oldToNew
    .map((item, index) => normalizeEpisode(item, index + 1))
    .filter((episode) => episode.videoId)
    .sort((a, b) => a.episodeNo - b.episodeNo || new Date(a.publishedAt) - new Date(b.publishedAt));

  state.channels[channelKey] ||= { lastSentEpisodeNo: 0, episodes: [] };
  const previousDeliveryByVideo = new Map((state.channels[channelKey].episodes || []).map((episode) => [episode.videoId, {
    sentAt: episode.sentAt || null,
    campaignId: episode.campaignId || null,
    deliveryMethod: episode.deliveryMethod || null,
  }]));
  state.channels[channelKey].episodes = episodes.map((episode) => ({
    ...episode,
    ...previousDeliveryByVideo.get(episode.videoId),
  }));
  state.channels[channelKey].lastSyncedAt = new Date().toISOString();
  return state.channels[channelKey].episodes;
}

function selectNextEpisode(channelKey, state) {
  const channel = state.channels[channelKey];
  const sentNos = new Set((channel.episodes || []).filter((episode) => episode.sentAt).map((episode) => episode.episodeNo));
  const next = (channel.episodes || [])
    .filter((episode) => !episode.sentAt && !sentNos.has(episode.episodeNo))
    .sort((a, b) => a.episodeNo - b.episodeNo)[0];
  if (!next) throw new Error(`No unsent episodes available for ${channelKey}`);
  return next;
}

function buildPrompt(channelKey, episode) {
  const config = CHANNELS[channelKey];
  return [
    `Create one production-ready weekly email newsletter for ${config.label}.`,
    `Audience: ${config.audience}.`,
    `Language mode: ${config.languageBrief}.`,
    `Source video: episode ${String(episode.episodeNo).padStart(3, "0")}, title "${episode.title}", URL ${episode.videoUrl}.`,
    `Video description: ${episode.description.slice(0, 1600)}`,
    "",
    "Rules:",
    ...config.contentRules.map((rule) => `- ${rule}`),
    "- Keep it useful for a parent opening the email on mobile.",
    "- Do not invent external facts, prices, claims, or episode details that are not inferable from the title/description.",
    "- Include exactly 3 learning_words.",
    "- Include one parent_activity that can be done in 5 minutes.",
    "- Include one clear CTA to watch the source video and one CTA to visit the Fursay site.",
    "",
    "Return only valid JSON with this shape:",
    JSON.stringify({
      subject: "string",
      preview_text: "string",
      hero_title: "string",
      intro: "string",
      learning_words: [
        { term: "string", pronunciation: "string", meaning: "string", example: "string" }
      ],
      parent_activity: "string",
      video_cta: "string",
      site_cta: "string",
      closing: "string"
    })
  ].join("\n");
}

async function loadCreatorKit() {
  try {
    return JSON.parse(await fs.readFile(CREATOR_KIT_PATH, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error("Missing fursay-optimized-site/creator-kit.json. Run node scripts/release-fursay.mjs --check-only before newsletter delivery.");
    }
    throw error;
  }
}

function creatorPackForChannel(channelKey, creatorKit) {
  const packKey = CREATOR_PACK_BY_CHANNEL[channelKey];
  const pack = creatorKit?.packs?.[packKey];
  if (!pack) throw new Error(`creator-kit.json is missing pack: ${packKey}`);
  for (const field of ["sampleShortlink", "trackedLandingUrl", "qrSvg", "youtubeDescription", "socialCaption", "newsletterBlurb"]) {
    if (!pack[field]) throw new Error(`creator-kit.json ${packKey}.${field} is required`);
  }
  if (!pack.placementLinks?.newsletterBlurb?.shortlink) {
    throw new Error(`creator-kit.json ${packKey}.placementLinks.newsletterBlurb.shortlink is required`);
  }
  if (!pack.trackedLandingUrl.includes("utm_source=creator_kit")) {
    throw new Error(`creator-kit.json ${packKey}.trackedLandingUrl must include utm_source=creator_kit`);
  }
  return { key: packKey, ...pack };
}

function buildCodexRequest(channelKey, episode, runId) {
  const config = CHANNELS[channelKey];
  const outputPath = path.join(PENDING_DIR, `${runId}-${channelKey}-ep${String(episode.episodeNo).padStart(3, "0")}.newsletter.json`);
  const schema = {
    episodeNo: "number",
    videoId: "string",
    subject: "string",
    preview_text: "string",
    hero_title: "string",
    intro: "string",
    learning_words: [
      { term: "string", pronunciation: "string", meaning: "string", example: "string" }
    ],
    parent_activity: "string",
    video_cta: "string",
    site_cta: "string",
    closing: "string"
  };

  return {
    runId,
    channel: channelKey,
    channelLabel: config.label,
    audience: config.audience,
    languageBrief: config.languageBrief,
    contentRules: config.contentRules,
    episode: {
      episodeNo: episode.episodeNo,
      videoId: episode.videoId,
      title: episode.title,
      description: episode.description,
      publishedAt: episode.publishedAt,
      videoUrl: episode.videoUrl,
      thumbnail: episode.thumbnail
    },
    requiredOutputPath: projectPath(outputPath),
    requiredSchema: schema,
    instructions: [
      `Create one production-ready weekly email newsletter for ${config.label}.`,
      `Use only the episode title, description, and video URL as source context.`,
      `Return and save exactly one JSON object matching requiredSchema at requiredOutputPath.`,
      "Do not include Markdown fences, comments, or extra top-level fields.",
      "Include exactly 3 learning_words.",
      "Do not claim the video is new unless the source metadata explicitly supports it.",
      "Keep the writing parent-friendly, mobile-readable, and suitable for an email."
    ]
  };
}

async function generateNewsletter(channelKey, episode) {
  const apiKey = requireEnv("OPENAI_API_KEY");
  const model = optionalEnv("OPENAI_MODEL") || "gpt-5.4-mini";
  const data = await fetchJson(OPENAI_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: buildPrompt(channelKey, episode),
      text: {
        format: {
          type: "json_schema",
          name: "fursay_newsletter",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["subject", "preview_text", "hero_title", "intro", "learning_words", "parent_activity", "video_cta", "site_cta", "closing"],
            properties: {
              subject: { type: "string" },
              preview_text: { type: "string" },
              hero_title: { type: "string" },
              intro: { type: "string" },
              learning_words: {
                type: "array",
                minItems: 3,
                maxItems: 3,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["term", "pronunciation", "meaning", "example"],
                  properties: {
                    term: { type: "string" },
                    pronunciation: { type: "string" },
                    meaning: { type: "string" },
                    example: { type: "string" }
                  }
                }
              },
              parent_activity: { type: "string" },
              video_cta: { type: "string" },
              site_cta: { type: "string" },
              closing: { type: "string" }
            }
          }
        }
      }
    })
  });

  const outputText = data.output_text || data.output?.flatMap((item) => item.content || []).find((part) => part.text)?.text;
  if (!outputText) throw new Error("OpenAI response did not include output_text");
  return JSON.parse(outputText);
}

function validateNewsletter(channelKey, episode, newsletter) {
  const errors = [];
  const config = CHANNELS[channelKey];
  const required = ["subject", "preview_text", "hero_title", "intro", "parent_activity", "video_cta", "site_cta", "closing"];
  for (const field of required) {
    if (!newsletter[field] || String(newsletter[field]).trim().length < 4) errors.push(`Missing or too short: ${field}`);
  }
  if (!Array.isArray(newsletter.learning_words) || newsletter.learning_words.length !== 3) {
    errors.push("learning_words must contain exactly 3 items");
  } else {
    newsletter.learning_words.forEach((word, index) => {
      for (const field of ["term", "pronunciation", "meaning", "example"]) {
        if (!word[field]) errors.push(`learning_words[${index}].${field} is required`);
      }
    });
  }
  if (!episode.videoUrl || !newsletter.video_cta) errors.push("video CTA and video URL are required");
  if (!config.siteUrl || !newsletter.site_cta) errors.push("site CTA and site URL are required");
  if (String(newsletter.subject || "").length > 255) errors.push("subject exceeds 255 characters");
  if (String(newsletter.preview_text || "").length > 255) errors.push("preview_text exceeds 255 characters");
  if (BLOCKED_COPY_PATTERN.test(JSON.stringify(newsletter))) errors.push("blocked placeholder text detected");
  if (channelKey === "arabic" && !/[\u0600-\u06FF]/.test(JSON.stringify(newsletter))) {
    errors.push("Arabic newsletter must contain Arabic text");
  }
  if (channelKey === "koko" && !/[\u4E00-\u9FFF]/.test(JSON.stringify(newsletter))) {
    errors.push("Koko newsletter must include Traditional Chinese parent support");
  }
  return errors;
}

function validateDeliveryArtifact(channelKey, episode, newsletter, html, richTextBody, trafficPack) {
  const errors = [];
  const config = CHANNELS[channelKey];
  const bodyText = `${newsletter.preview_text}\n${html}\n${richTextBody}`;

  if (BLOCKED_COPY_PATTERN.test(bodyText)) {
    errors.push("blocked placeholder text detected in rendered email body or preview");
  }
  if (!html.includes(episode.videoUrl) || !richTextBody.includes(episode.videoUrl)) {
    errors.push("rendered email must include the source video URL");
  }
  if (!html.includes(escapeHtml(trafficPack.trackedLandingUrl)) || !richTextBody.includes(trafficPack.trackedLandingUrl)) {
    errors.push("rendered email must include the creator-kit tracked site CTA URL");
  }
  const newsletterShortlink = trafficPack.placementLinks.newsletterBlurb.shortlink;
  if (!html.includes(newsletterShortlink) || !richTextBody.includes(newsletterShortlink)) {
    errors.push("rendered email must include the creator-kit newsletter shortlink");
  }
  if (!html.includes(escapeHtml(trafficPack.newsletterBlurb)) || !richTextBody.includes(trafficPack.newsletterBlurb)) {
    errors.push("rendered email must include the creator-kit newsletter blurb");
  }
  if (!html.includes(escapeHtml(newsletter.video_cta)) || !richTextBody.includes(newsletter.video_cta)) {
    errors.push("rendered email must include the video CTA text");
  }
  if (!html.includes(escapeHtml(newsletter.site_cta)) || !richTextBody.includes(newsletter.site_cta)) {
    errors.push("rendered email must include the site CTA text");
  }
  if (!String(newsletter.subject || "").trim()) errors.push("subject is required before handoff");
  if (!String(newsletter.preview_text || "").trim()) errors.push("preheader is required before handoff");
  if (!Array.isArray(newsletter.learning_words) || newsletter.learning_words.length !== 3) {
    errors.push("exactly 3 learning words are required before handoff");
  }
  return errors;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderHtml(channelKey, episode, newsletter, trafficPack) {
  const config = CHANNELS[channelKey];
  const dir = channelKey === "arabic" ? "rtl" : "ltr";
  const align = channelKey === "arabic" ? "right" : "left";
  const words = newsletter.learning_words.map((word) => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #e8e1d5;"><strong>${escapeHtml(word.term)}</strong><br><span style="color:#6d6258;">${escapeHtml(word.pronunciation)}</span></td>
      <td style="padding:12px;border-bottom:1px solid #e8e1d5;">${escapeHtml(word.meaning)}<br><em>${escapeHtml(word.example)}</em></td>
    </tr>`).join("");

  return `<!doctype html>
<html>
<body style="margin:0;background:#f7f2e8;font-family:Arial,'Noto Sans TC',sans-serif;color:#2f2a25;">
  <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(newsletter.preview_text)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f2e8;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#fffaf1;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="padding:28px;text-align:${align};direction:${dir};">
            <p style="margin:0 0 8px;color:#8a6f49;font-size:14px;">${escapeHtml(config.label)} · EP${String(episode.episodeNo).padStart(3, "0")}</p>
            <h1 style="margin:0 0 14px;font-size:28px;line-height:1.2;color:#2e5836;">${escapeHtml(newsletter.hero_title)}</h1>
            <p style="font-size:17px;line-height:1.7;margin:0 0 20px;">${escapeHtml(newsletter.intro)}</p>
            ${episode.thumbnail ? `<img src="${escapeHtml(episode.thumbnail)}" alt="${escapeHtml(episode.title)}" style="width:100%;height:auto;border-radius:10px;margin:0 0 22px;">` : ""}
            <h2 style="font-size:20px;margin:18px 0 10px;">Learning words</h2>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e8e1d5;border-collapse:collapse;">${words}</table>
            <h2 style="font-size:20px;margin:24px 0 10px;">Parent activity</h2>
            <p style="font-size:16px;line-height:1.7;">${escapeHtml(newsletter.parent_activity)}</p>
            <p style="margin:26px 0 12px;">
              <a href="${escapeHtml(episode.videoUrl)}" style="display:inline-block;background:#2e9d5f;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;">${escapeHtml(newsletter.video_cta)}</a>
            </p>
            <p style="margin:0 0 20px;">
              <a href="${escapeHtml(trafficPack.trackedLandingUrl)}" style="color:#c05f18;font-weight:bold;">${escapeHtml(newsletter.site_cta)}</a>
            </p>
            <p style="font-size:15px;line-height:1.65;margin:18px 0 0;background:#f7f2e8;border-radius:10px;padding:14px;">
              ${escapeHtml(trafficPack.newsletterBlurb)}<br>
              <a href="${escapeHtml(trafficPack.placementLinks.newsletterBlurb.shortlink)}" style="color:#c05f18;font-weight:bold;">${escapeHtml(trafficPack.placementLinks.newsletterBlurb.shortlink)}</a>
            </p>
            <p style="font-size:16px;line-height:1.7;margin:20px 0 0;">${escapeHtml(newsletter.closing)}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function renderRichTextBody(channelKey, episode, newsletter, trafficPack) {
  const config = CHANNELS[channelKey];
  const words = newsletter.learning_words
    .map((word) => [
      `${word.term} - ${word.pronunciation}`,
      `${word.meaning}`,
      `${word.example}`
    ].join("\n"))
    .join("\n\n");

  return [
    `${config.label} - EP${String(episode.episodeNo).padStart(3, "0")}`,
    "",
    newsletter.hero_title,
    "",
    newsletter.intro,
    "",
    "Learning words",
    words,
    "",
    "Parent activity",
    newsletter.parent_activity,
    "",
    newsletter.video_cta,
    episode.videoUrl,
    "",
    newsletter.site_cta,
    trafficPack.trackedLandingUrl,
    "",
    trafficPack.newsletterBlurb,
    trafficPack.placementLinks.newsletterBlurb.shortlink,
    "",
    newsletter.closing
  ].join("\n");
}

function buildEditorBlocks(channelKey, episode, newsletter, trafficPack) {
  const config = CHANNELS[channelKey];
  return [
    {
      name: "Header",
      action: `Add a heading block with: ${config.label} - EP${String(episode.episodeNo).padStart(3, "0")}`
    },
    {
      name: "Hero title",
      action: `Add the main title: ${newsletter.hero_title}`
    },
    {
      name: "Intro",
      action: "Add the intro paragraph below the title."
    },
    {
      name: "Cover image",
      action: episode.thumbnail
        ? `Add an image block using ${episode.thumbnail}. Link the image to ${episode.videoUrl}.`
        : "Skip only if MailerLite cannot add an image block; do not replace it with plain text."
    },
    {
      name: "Learning words",
      action: "Add three repeated word rows or separate text blocks, one for each learning word, instead of pasting them as one unstyled paragraph.",
      items: newsletter.learning_words.map((word) => `${word.term} - ${word.pronunciation}: ${word.meaning}`)
    },
    {
      name: "Parent activity",
      action: "Add a separate text block for the parent activity."
    },
    {
      name: "Primary CTA",
      action: `Add a button block labeled "${newsletter.video_cta}" and link it to ${episode.videoUrl}.`
    },
    {
      name: "Site CTA",
      action: `Add a secondary text link labeled "${newsletter.site_cta}" and link it to ${trafficPack.trackedLandingUrl}.`
    },
    {
      name: "Sample pack CTA",
      action: `Add a short text block with this sample-pack line and link: ${trafficPack.newsletterBlurb} ${trafficPack.placementLinks.newsletterBlurb.shortlink}.`
    },
    {
      name: "Footer QA",
      action: "Before scheduling, preview the campaign footer and fail closed if it still says Add your company postal address here or any other default placeholder."
    }
  ];
}

function buildPostSendGmailCheck(channelKey, trafficPack) {
  const config = CHANNELS[channelKey];
  return {
    expectedAfterTaipei: channelKey === "koko" ? "Monday 09:10 Asia/Taipei" : "Wednesday 09:10 Asia/Taipei",
    searchQuery: `from:hello@fursay.com (${config.label} OR Fursay) newer_than:7d -in:trash -in:spam`,
    checks: [
      "latest matching Gmail message exists after the scheduled send slot",
      "message body does not contain Add your company postal address here, TODO, placeholder, or lorem ipsum",
      `message body includes ${trafficPack.trackedLandingUrl}`,
      `message body includes ${trafficPack.placementLinks.newsletterBlurb.shortlink}`,
      "message body includes a YouTube CTA link",
      "message did not collapse into a single plain-text paragraph"
    ]
  };
}

function taipeiDateString(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function nextTaipeiDate(daysFromNow = 1) {
  const now = new Date();
  const target = new Date(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000);
  return taipeiDateString(target);
}

function nextSendDate(channelKey) {
  const weekdays = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6
  };
  const targetWeekday = weekdays[CHANNELS[channelKey].sendWeekday];
  const now = new Date();
  const todayParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    weekday: "long"
  }).formatToParts(now);
  const todayName = todayParts.find((part) => part.type === "weekday")?.value;
  const todayWeekday = weekdays[todayName];
  let days = (targetWeekday - todayWeekday + 7) % 7;
  if (days === 0) days = 7;
  return nextTaipeiDate(days);
}

function parseScheduleTime(value = "09:00") {
  const match = String(value).match(/^(\d{2}):(\d{2})$/);
  if (!match) throw new Error("--schedule-time must use HH:MM format");
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) throw new Error("--schedule-time must be a valid 24-hour time");
  return { hours: match[1], minutes: match[2] };
}

function scheduleFor(channelKey, args = {}) {
  const delivery = args.delivery || "scheduled";
  if (!["scheduled", "instant"].includes(delivery)) {
    throw new Error("--delivery must be one of: scheduled, instant");
  }
  if (delivery === "instant") {
    return { delivery, scheduledAt: new Date().toISOString() };
  }
  const date = args.scheduleDate || nextSendDate(channelKey);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("--schedule-date must use YYYY-MM-DD format");
  const { hours, minutes } = parseScheduleTime(args.scheduleTime || optionalEnv("NEWSLETTER_DEFAULT_TIME") || "09:00");
  return { delivery, date, hours, minutes, scheduledAt: `${date}T${hours}:${minutes}:00+08:00` };
}

async function runApiPreflight(args, run) {
  const config = CHANNELS[args.channel];
  const token = requireEnv("MAILERLITE_API_TOKEN");
  const groupId = requireEnv(config.groupEnv);
  const from = requireEnv("NEWSLETTER_FROM_EMAIL");
  const replyTo = optionalEnv("NEWSLETTER_REPLY_TO") || from;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(from)) throw new Error("NEWSLETTER_FROM_EMAIL must be a valid email address");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(replyTo)) throw new Error("NEWSLETTER_REPLY_TO must be a valid email address");

  const groups = await fetchJson(`${MAILERLITE_API}/groups?limit=1000`, {
    headers: mailerLiteHeaders(token)
  });
  const group = (groups.data || []).find((item) => String(item.id) === String(groupId));
  if (!group) throw new Error(`Configured group id from ${config.groupEnv} was not found in MailerLite`);

  const schedule = scheduleFor(args.channel, args);
  const warnings = [];
  if (!Number(group.active_count || 0)) {
    warnings.push(`Target group "${group.name}" has 0 active subscribers`);
  }
  run.status = "api_preflight_passed";
  run.scheduledAt = schedule.scheduledAt;
  run.delivery = schedule.delivery;
  run.warnings = warnings;
  run.mailerLiteApi = {
    baseUrl: MAILERLITE_API,
    groupId,
    groupName: group.name,
    groupActiveCount: group.active_count ?? null,
    from,
    replyTo,
    delivery: schedule.delivery,
    scheduledAt: schedule.scheduledAt,
    warnings,
    contentApiEnabled: envFlag("MAILERLITE_ALLOW_CONTENT_API_SEND"),
    contentSubmission: "requires MailerLite Advanced plan when emails.*.content is sent by API"
  };
  return {
    status: run.status,
    channel: run.channel,
    groupName: group.name,
    groupActiveCount: group.active_count ?? null,
    delivery: schedule.delivery,
    scheduledAt: schedule.scheduledAt,
    warnings,
    contentApiEnabled: run.mailerLiteApi.contentApiEnabled,
    contentSubmission: run.mailerLiteApi.contentSubmission
  };
}

async function resolveMailerLiteTarget(channelKey, schedule) {
  const config = CHANNELS[channelKey];
  const token = requireEnv("MAILERLITE_API_TOKEN");
  const groupId = requireEnv(config.groupEnv);
  const from = requireEnv("NEWSLETTER_FROM_EMAIL");
  const fromName = optionalEnv("NEWSLETTER_FROM_NAME") || "Fursay";
  const replyTo = optionalEnv("NEWSLETTER_REPLY_TO") || from;

  const groups = await fetchJson(`${MAILERLITE_API}/groups?limit=1000`, {
    headers: mailerLiteHeaders(token)
  });
  const group = (groups.data || []).find((item) => String(item.id) === String(groupId));
  if (!group) throw new Error(`Configured group id from ${config.groupEnv} was not found in MailerLite`);

  return {
    groupId,
    groupName: group.name,
    groupActiveCount: group.active_count ?? null,
    from,
    fromName,
    replyTo,
    delivery: schedule.delivery,
    scheduledAt: schedule.scheduledAt
  };
}

async function createAndScheduleCampaign(channelKey, episode, newsletter, html, args = {}) {
  const config = CHANNELS[channelKey];
  const token = requireEnv("MAILERLITE_API_TOKEN");
  const groupId = requireEnv(config.groupEnv);
  const from = requireEnv("NEWSLETTER_FROM_EMAIL");
  const fromName = optionalEnv("NEWSLETTER_FROM_NAME") || "Fursay";
  const replyTo = optionalEnv("NEWSLETTER_REPLY_TO") || from;
  const schedule = scheduleFor(channelKey, args);

  const campaign = await fetchJson(`${MAILERLITE_API}/campaigns`, {
    method: "POST",
    headers: mailerLiteHeaders(token),
    body: JSON.stringify({
      name: `${config.label} EP${String(episode.episodeNo).padStart(3, "0")} - ${schedule.delivery === "scheduled" ? schedule.date : "instant"}`,
      type: "regular",
      groups: [groupId],
      emails: [{
        subject: newsletter.subject,
        from_name: fromName,
        from,
        reply_to: replyTo,
        content: html
      }]
    })
  });

  const campaignId = campaign.data?.id || campaign.id;
  if (!campaignId) throw new Error("MailerLite create campaign response did not include campaign id");

  const scheduleBody = { delivery: schedule.delivery };
  if (schedule.delivery === "scheduled") {
    scheduleBody.schedule = {
      date: schedule.date,
      hours: schedule.hours,
      minutes: schedule.minutes
    };
  }
  const timezoneId = optionalEnv("MAILERLITE_TIMEZONE_ID");
  if (timezoneId && scheduleBody.schedule) scheduleBody.schedule.timezone_id = Number(timezoneId);

  const scheduled = await fetchJson(`${MAILERLITE_API}/campaigns/${campaignId}/schedule`, {
    method: "POST",
    headers: mailerLiteHeaders(token),
    body: JSON.stringify(scheduleBody)
  });

  return {
    campaignId,
    scheduledAt: schedule.scheduledAt,
    delivery: schedule.delivery,
    mailerLiteStatus: scheduled.data?.status || "scheduled"
  };
}

async function writeRunArtifact(run) {
  await fs.mkdir(RUNS_DIR, { recursive: true });
  const file = path.join(RUNS_DIR, `${run.startedAt.slice(0, 10)}-${run.channel}-ep${String(run.episodeNo || 0).padStart(3, "0")}-${run.runId}.json`);
  await fs.writeFile(file, `${JSON.stringify(run, null, 2)}\n`);
  return file;
}

async function writePendingRequest(request) {
  await fs.mkdir(PENDING_DIR, { recursive: true });
  const file = path.join(PENDING_DIR, `${request.runId}-${request.channel}-ep${String(request.episode.episodeNo).padStart(3, "0")}.request.json`);
  await fs.writeFile(file, `${JSON.stringify(request, null, 2)}\n`);
  return file;
}

async function writeBrowserHandoff(handoff) {
  await fs.mkdir(BROWSER_HANDOFF_DIR, { recursive: true });
  const baseName = `${handoff.createdAt.slice(0, 10)}-${handoff.channel}-ep${String(handoff.episodeNo || 0).padStart(3, "0")}-${handoff.runId}`;
  const jsonFile = path.join(BROWSER_HANDOFF_DIR, `${baseName}.json`);
  const mdFile = path.join(BROWSER_HANDOFF_DIR, `${baseName}.md`);
  const editorBlocks = handoff.browser.editorBlocks
    .map((block, index) => [
      `${index + 1}. ${block.name}: ${block.action}`,
      ...(block.items || []).map((item) => `   - ${item}`)
    ].join("\n"))
    .join("\n");
  const postSendChecks = handoff.postSendGmailCheck.checks.map((check) => `- ${check}`).join("\n");
  await fs.writeFile(jsonFile, `${JSON.stringify(handoff, null, 2)}\n`);
  await fs.writeFile(mdFile, [
    `# ${handoff.campaignName}`,
    "",
    `- Channel: ${handoff.channel}`,
    `- MailerLite group: ${handoff.mailerLite.groupName} (${handoff.mailerLite.groupActiveCount} active)`,
    `- Sender: ${handoff.mailerLite.fromName} <${handoff.mailerLite.from}>`,
    `- Reply-to: ${handoff.mailerLite.replyTo}`,
    `- Schedule: ${handoff.schedule.scheduledAt}`,
    `- Editor: ${handoff.browser.editor}`,
    "",
    "## Subject",
    handoff.email.subject,
    "",
    "## Preheader",
    handoff.email.previewText,
    "",
    "## Creator Kit",
    `- Pack: ${handoff.creatorKit.pack}`,
    `- Tracked landing: ${handoff.creatorKit.trackedLandingUrl}`,
    `- Sample shortlink: ${handoff.creatorKit.sampleShortlink}`,
    `- QR SVG: ${handoff.creatorKit.qrSvg}`,
    `- Newsletter blurb: ${handoff.creatorKit.newsletterBlurb}`,
    "",
    "## MailerLite Editor Order",
    "Use MailerLite built-in rich-text, image, and button blocks. Do not paste the whole body as one plain-text block.",
    "",
    editorBlocks,
    "",
    "## Rich Text Body",
    handoff.email.richTextBody,
    "",
    "## Footer QA",
    "- Preview the footer before scheduling.",
    "- Stop and record a chrome-result failure if the footer contains Add your company postal address here, TODO, placeholder, or lorem ipsum.",
    "- Confirm the unsubscribe footer exists and the sender/reply-to fields match the values above.",
    "",
    "## Post-send Gmail Spot Check",
    `- Check after: ${handoff.postSendGmailCheck.expectedAfterTaipei}`,
    `- Gmail query: ${handoff.postSendGmailCheck.searchQuery}`,
    postSendChecks,
    "",
    "## Source",
    handoff.episode.videoUrl,
    ""
  ].join("\n"));
  return { jsonFile, mdFile };
}

function findEpisode(channelKey, state, episodeNo, videoId) {
  const episodes = state.channels[channelKey]?.episodes || [];
  return episodes.find((episode) => episode.videoId === videoId)
    || episodes.find((episode) => Number(episode.episodeNo) === Number(episodeNo));
}

async function loadNewsletterInput(inputPath) {
  if (!inputPath) throw new Error("--input is required for newsletter delivery modes");
  const fullPath = path.isAbsolute(inputPath) ? inputPath : path.join(ROOT, inputPath);
  const data = JSON.parse(await fs.readFile(fullPath, "utf8"));
  return { fullPath, data };
}

function scheduleArgs(args) {
  const parts = [];
  if (args.scheduleDate) parts.push(`--schedule-date ${args.scheduleDate}`);
  if (args.scheduleTime) parts.push(`--schedule-time ${args.scheduleTime}`);
  if (args.delivery && args.delivery !== "scheduled") parts.push(`--delivery ${args.delivery}`);
  return parts.length ? ` ${parts.join(" ")}` : "";
}

function normalizeNewsletterInput(newsletter) {
  const cleanNewsletter = { ...newsletter };
  delete cleanNewsletter.episodeNo;
  delete cleanNewsletter.episode_no;
  delete cleanNewsletter.videoId;
  delete cleanNewsletter.video_id;
  delete cleanNewsletter.episode;
  return cleanNewsletter;
}

async function prepareNewsletterForDelivery(args, state, run) {
  const { fullPath, data: newsletter } = await loadNewsletterInput(args.input);
  const episodeNo = newsletter.episodeNo || newsletter.episode_no || newsletter.episode?.episodeNo;
  const videoId = newsletter.videoId || newsletter.video_id || newsletter.episode?.videoId;

  const episode = findEpisode(args.channel, state, episodeNo, videoId) || selectNextEpisode(args.channel, state);
  if (episode.sentAt) throw new Error(`Episode already sent: ${args.channel} ep${episode.episodeNo}`);

  run.episodeNo = episode.episodeNo;
  run.videoId = episode.videoId;
  run.videoUrl = episode.videoUrl;
  run.inputPath = projectPath(fullPath);

  const cleanNewsletter = normalizeNewsletterInput(newsletter);
  const qaErrors = validateNewsletter(args.channel, episode, cleanNewsletter);
  const creatorKit = await loadCreatorKit();
  const trafficPack = creatorPackForChannel(args.channel, creatorKit);

  const html = renderHtml(args.channel, episode, cleanNewsletter, trafficPack);
  const richTextBody = renderRichTextBody(args.channel, episode, cleanNewsletter, trafficPack);
  qaErrors.push(...validateDeliveryArtifact(args.channel, episode, cleanNewsletter, html, richTextBody, trafficPack));
  run.qaErrors = qaErrors;
  if (qaErrors.length) throw new Error(`QA failed: ${qaErrors.join("; ")}`);

  run.newsletter = cleanNewsletter;
  run.htmlPreview = html;
  run.richTextPreview = richTextBody;
  run.creatorKit = {
    pack: trafficPack.key,
    sampleShortlink: trafficPack.sampleShortlink,
    newsletterShortlink: trafficPack.placementLinks.newsletterBlurb.shortlink,
    trackedLandingUrl: trafficPack.trackedLandingUrl,
    qrSvg: trafficPack.qrSvg
  };

  return { fullPath, newsletter: cleanNewsletter, episode, html, richTextBody, trafficPack };
}

async function runPrepare(args, state, run) {
  const episodes = await syncEpisodes(args.channel, state);
  run.syncedEpisodes = episodes.length;
  const episode = selectNextEpisode(args.channel, state);
  run.episodeNo = episode.episodeNo;
  run.videoId = episode.videoId;
  run.videoUrl = episode.videoUrl;

  const request = buildCodexRequest(args.channel, episode, run.runId);
  const requestPath = await writePendingRequest(request);
  run.requestPath = projectPath(requestPath);
  run.newsletterOutputPath = request.requiredOutputPath;
  run.status = "prepared";
  return {
    status: run.status,
    channel: run.channel,
    episodeNo: run.episodeNo,
    videoUrl: run.videoUrl,
    requestPath: run.requestPath,
    newsletterOutputPath: request.requiredOutputPath,
    nextCommand: `node scripts/newsletter-runner.mjs --mode send --channel ${run.channel} --input ${request.requiredOutputPath}${run.dryRun ? " --dry-run" : ""}`,
    codexTask: [
      `Read ${run.requestPath}.`,
      `Create the required newsletter JSON at ${request.requiredOutputPath}.`,
      `Then run the nextCommand.`
    ].join(" ")
  };
}

async function runSend(args, state, run) {
  const { newsletter: cleanNewsletter, episode, html } = await prepareNewsletterForDelivery(args, state, run);

  if (args.dryRun) {
    const schedule = scheduleFor(args.channel, args);
    run.status = "dry_run_passed";
    run.delivery = schedule.delivery;
    run.scheduledAt = schedule.scheduledAt;
  } else {
    if (!envFlag("MAILERLITE_ALLOW_CONTENT_API_SEND")) {
      throw new Error("MailerLite content API send is disabled. Set MAILERLITE_ALLOW_CONTENT_API_SEND=true only after the account supports Advanced plan content submission.");
    }
    const scheduled = await createAndScheduleCampaign(args.channel, episode, cleanNewsletter, html, args);
    Object.assign(run, scheduled);
    run.status = "scheduled";
    episode.sentAt = new Date().toISOString();
    episode.campaignId = scheduled.campaignId;
    state.channels[args.channel].lastSentEpisodeNo = Math.max(state.channels[args.channel].lastSentEpisodeNo || 0, episode.episodeNo);
  }

  return {
    status: run.status,
    channel: run.channel,
    episodeNo: run.episodeNo,
    videoUrl: run.videoUrl,
    campaignId: run.campaignId || null,
    scheduledAt: run.scheduledAt || null
  };
}

async function runChromeHandoff(args, state, run) {
  const { newsletter, episode, html, richTextBody, trafficPack } = await prepareNewsletterForDelivery(args, state, run);
  const schedule = scheduleFor(args.channel, args);
  const target = await resolveMailerLiteTarget(args.channel, schedule);
  const config = CHANNELS[args.channel];
  const warnings = [];

  if (!Number(target.groupActiveCount || 0)) {
    warnings.push(`Target group "${target.groupName}" has 0 active subscribers`);
  }

  const handoff = {
    version: 1,
    runId: run.runId,
    channel: args.channel,
    channelLabel: config.label,
    createdAt: new Date().toISOString(),
    episodeNo: episode.episodeNo,
    campaignName: `${config.label} EP${String(episode.episodeNo).padStart(3, "0")} - ${schedule.delivery === "scheduled" ? schedule.date : "instant"}`,
    episode: {
      episodeNo: episode.episodeNo,
      videoId: episode.videoId,
      title: episode.title,
      videoUrl: episode.videoUrl,
      thumbnail: episode.thumbnail
    },
    schedule,
    mailerLite: target,
    email: {
      subject: newsletter.subject,
      previewText: newsletter.preview_text,
      heroTitle: newsletter.hero_title,
      richTextBody,
      htmlPreview: html
    },
    creatorKit: {
      pack: trafficPack.key,
      sampleShortlink: trafficPack.sampleShortlink,
      newsletterShortlink: trafficPack.placementLinks.newsletterBlurb.shortlink,
      trackedLandingUrl: trafficPack.trackedLandingUrl,
      qrSvg: trafficPack.qrSvg,
      newsletterBlurb: trafficPack.newsletterBlurb
    },
    browser: {
      requiredLoginUrl: "https://dashboard.mailerlite.com/dashboard",
      campaignUrl: "https://dashboard.mailerlite.com/campaigns",
      campaignType: "Regular campaign",
      editor: "Rich-text editor",
      action: "Create or duplicate a regular campaign, build the email with MailerLite blocks in the listed order, choose the listed group, set the schedule, then confirm it appears in Outbox.",
      editorBlocks: buildEditorBlocks(args.channel, episode, newsletter, trafficPack),
      successCommand: `node scripts/newsletter-runner.mjs --mode chrome-result --channel ${args.channel} --input ${run.inputPath} --browser-status scheduled --campaign-url <outbox-or-campaign-url>${scheduleArgs(args)}`,
      failureCommand: `node scripts/newsletter-runner.mjs --mode chrome-result --channel ${args.channel} --input ${run.inputPath} --browser-status failed --failure-code <login_required|ui_changed|group_missing|subscriber_empty|schedule_blocked|unknown> --failure-detail "<exact blocker>"`
    },
    postSendGmailCheck: buildPostSendGmailCheck(args.channel, trafficPack),
    warnings
  };

  const { jsonFile, mdFile } = await writeBrowserHandoff(handoff);
  run.status = "chrome_handoff_ready";
  run.delivery = schedule.delivery;
  run.scheduledAt = schedule.scheduledAt;
  run.browserHandoff = {
    jsonPath: projectPath(jsonFile),
    mdPath: projectPath(mdFile),
    editor: handoff.browser.editor,
    action: handoff.browser.action
  };
  run.mailerLiteBrowserTarget = target;
  run.warnings = warnings;

  return {
    status: run.status,
    channel: run.channel,
    episodeNo: run.episodeNo,
    videoUrl: run.videoUrl,
    scheduledAt: run.scheduledAt,
    groupName: target.groupName,
    groupActiveCount: target.groupActiveCount,
    browserHandoffJson: run.browserHandoff.jsonPath,
    browserHandoffMd: run.browserHandoff.mdPath,
    successCommand: handoff.browser.successCommand,
    failureCommand: handoff.browser.failureCommand,
    warnings
  };
}

async function runChromeResult(args, state, run) {
  const { episode } = await prepareNewsletterForDelivery(args, state, run);
  const allowed = ["scheduled", "sent", "failed"];
  if (!allowed.includes(args.browserStatus)) {
    throw new Error("--browser-status must be one of: scheduled, sent, failed");
  }

  run.browserResult = {
    status: args.browserStatus,
    campaignId: args.campaignId || null,
    campaignUrl: args.campaignUrl || null,
    failureCode: args.failureCode || null,
    failureDetail: args.failureDetail || null,
    handoffPath: args.handoff || null,
    recordedAt: new Date().toISOString()
  };

  if (args.browserStatus === "failed") {
    run.status = "chrome_publish_failed";
    run.providerErrorCode = args.failureCode || "browser_publish_failed";
    run.error = args.failureDetail || "Chrome publishing failed before MailerLite outbox confirmation";
  } else {
    const schedule = scheduleFor(args.channel, args);
    run.status = args.browserStatus === "sent" ? "sent_by_chrome" : "scheduled_by_chrome";
    run.delivery = schedule.delivery;
    run.scheduledAt = schedule.scheduledAt;
    run.campaignId = args.campaignId || null;
    run.campaignUrl = args.campaignUrl || null;
    episode.sentAt = new Date().toISOString();
    episode.campaignId = args.campaignId || args.campaignUrl || `chrome-${run.runId}`;
    episode.deliveryMethod = "mailerlite_chrome";
    state.channels[args.channel].lastSentEpisodeNo = Math.max(state.channels[args.channel].lastSentEpisodeNo || 0, episode.episodeNo);
  }

  return {
    status: run.status,
    channel: run.channel,
    episodeNo: run.episodeNo,
    videoUrl: run.videoUrl,
    campaignId: run.campaignId || null,
    campaignUrl: run.campaignUrl || null,
    scheduledAt: run.scheduledAt || null,
    browserStatus: args.browserStatus,
    failureCode: args.failureCode || null,
    failureDetail: args.failureDetail || null
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }
  if (!CHANNELS[args.channel]) throw new Error("--channel must be one of: koko, arabic");

  await loadDotEnv();
  const state = await readState();
  const run = {
    runId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    channel: args.channel,
    mode: args.mode,
    dryRun: args.dryRun,
    startedAt: new Date().toISOString(),
    status: "started"
  };
  let result = null;

  try {
    if (args.mode === "prepare") {
      result = await runPrepare(args, state, run);
    } else if (args.mode === "api-preflight") {
      result = await runApiPreflight(args, run);
    } else if (args.mode === "send") {
      result = await runSend(args, state, run);
    } else if (args.mode === "chrome-handoff") {
      result = await runChromeHandoff(args, state, run);
    } else if (args.mode === "chrome-result") {
      result = await runChromeResult(args, state, run);
    } else {
      const episodes = await syncEpisodes(args.channel, state);
      run.syncedEpisodes = episodes.length;
      if (args.syncOnly) {
        run.status = "synced";
        result = { status: run.status, channel: run.channel, syncedEpisodes: episodes.length };
        return;
      }

      const episode = selectNextEpisode(args.channel, state);
      run.episodeNo = episode.episodeNo;
      run.videoId = episode.videoId;
      run.videoUrl = episode.videoUrl;

      const newsletter = await generateNewsletter(args.channel, episode);
      const qaErrors = validateNewsletter(args.channel, episode, newsletter);

      const creatorKit = await loadCreatorKit();
      const trafficPack = creatorPackForChannel(args.channel, creatorKit);
      const html = renderHtml(args.channel, episode, newsletter, trafficPack);
      const richTextBody = renderRichTextBody(args.channel, episode, newsletter, trafficPack);
      qaErrors.push(...validateDeliveryArtifact(args.channel, episode, newsletter, html, richTextBody, trafficPack));
      run.qaErrors = qaErrors;
      if (qaErrors.length) throw new Error(`QA failed: ${qaErrors.join("; ")}`);

      run.newsletter = newsletter;
      run.htmlPreview = html;
      run.richTextPreview = richTextBody;
      run.creatorKit = {
        pack: trafficPack.key,
        sampleShortlink: trafficPack.sampleShortlink,
        trackedLandingUrl: trafficPack.trackedLandingUrl,
        qrSvg: trafficPack.qrSvg
      };

      if (args.dryRun) {
        const schedule = scheduleFor(args.channel, args);
        run.status = "dry_run_passed";
        run.delivery = schedule.delivery;
        run.scheduledAt = schedule.scheduledAt;
      } else {
        if (!envFlag("MAILERLITE_ALLOW_CONTENT_API_SEND")) {
          throw new Error("MailerLite content API send is disabled. Set MAILERLITE_ALLOW_CONTENT_API_SEND=true only after the account supports Advanced plan content submission.");
        }
        const scheduled = await createAndScheduleCampaign(args.channel, episode, newsletter, html, args);
        Object.assign(run, scheduled);
        run.status = "scheduled";
        episode.sentAt = new Date().toISOString();
        episode.campaignId = scheduled.campaignId;
        state.channels[args.channel].lastSentEpisodeNo = Math.max(state.channels[args.channel].lastSentEpisodeNo || 0, episode.episodeNo);
      }
    }
  } catch (error) {
    run.status = "failed";
    run.error = error.message;
    run.providerErrorCode = classifyMailerLiteError(error);
    process.exitCode = 1;
  } finally {
    run.finishedAt = new Date().toISOString();
    state.runs ||= [];
    state.runs.unshift({
      runId: run.runId,
      channel: run.channel,
      mode: run.mode,
      episodeNo: run.episodeNo || null,
      status: run.status,
      dryRun: run.dryRun,
      campaignId: run.campaignId || null,
      scheduledAt: run.scheduledAt || null,
      providerErrorCode: run.providerErrorCode || null,
      warnings: run.warnings || [],
      error: run.error || null,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt
    });
    state.runs = state.runs.slice(0, 50);
    const artifact = await writeRunArtifact(run);
    await writeState(state);
    console.log(JSON.stringify({
      ...(result || {}),
      status: run.status,
      channel: run.channel,
      mode: run.mode,
      episodeNo: run.episodeNo || null,
      videoUrl: run.videoUrl || null,
      campaignId: run.campaignId || null,
      scheduledAt: run.scheduledAt || null,
      delivery: run.delivery || null,
      providerErrorCode: run.providerErrorCode || null,
      warnings: run.warnings || [],
      browserHandoff: run.browserHandoff || null,
      browserResult: run.browserResult || null,
      artifact,
      requestPath: run.requestPath || null,
      newsletterOutputPath: run.newsletterOutputPath || null,
      retryCommand: run.mode === "send"
        ? `node scripts/newsletter-runner.mjs --mode send --channel ${run.channel} --input ${args.input || "<newsletter.json>"}${run.dryRun ? " --dry-run" : ""}`
        : run.mode === "chrome-handoff"
          ? `node scripts/newsletter-runner.mjs --mode chrome-handoff --channel ${run.channel} --input ${args.input || "<newsletter.json>"}`
        : run.mode === "chrome-result"
          ? `node scripts/newsletter-runner.mjs --mode chrome-result --channel ${run.channel} --input ${args.input || "<newsletter.json>"} --browser-status ${args.browserStatus || "<scheduled|failed>"}`
        : run.mode === "prepare"
          ? `node scripts/newsletter-runner.mjs --mode prepare --channel ${run.channel}${run.dryRun ? " --dry-run" : ""}`
          : run.mode === "api-preflight"
            ? `node scripts/newsletter-runner.mjs --mode api-preflight --channel ${run.channel}`
          : `node scripts/newsletter-runner.mjs --channel ${run.channel}${run.dryRun ? " --dry-run" : ""}`,
      error: run.error || null
    }, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
