import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const DEFAULT_OUT = "/tmp/fursay-public-kit-parity";
const SITE_DIR = "fursay-optimized-site";
const MANIFESTS = [
  { key: "links", json: "/links.json", page: "/links" },
  { key: "share-kit", json: "/share-kit.json", page: "/share-kit" },
  { key: "traffic-launch", json: "/traffic-launch.json", page: "/traffic-launch" },
];

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { outDir: DEFAULT_OUT, baseUrl: "" };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--out-dir") parsed.outDir = args[++i];
    if (args[i] === "--base-url") parsed.baseUrl = args[++i].replace(/\/$/, "");
  }
  return parsed;
}

function localFile(pathname) {
  if (pathname.endsWith(".json")) return pathname.slice(1);
  if (pathname === "/") return "index.html";
  if (pathname.endsWith("/")) return `${pathname.slice(1)}index.html`;
  return `${pathname.slice(1)}.html`;
}

async function readText(baseUrl, pathname) {
  if (baseUrl) {
    const response = await fetch(`${baseUrl}${pathname}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${pathname} status ${response.status}`);
    return response.text();
  }
  return readFile(resolve(process.cwd(), SITE_DIR, localFile(pathname)), "utf8");
}

async function readJson(baseUrl, pathname) {
  return JSON.parse(await readText(baseUrl, pathname));
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalized(value) {
  return decodeHtml(value).replace(/\r\n/g, "\n").trim();
}

function pageContains(html, value) {
  if (value === undefined || value === null || value === "") return true;
  const haystack = normalized(html);
  const needle = normalized(value);
  return haystack.includes(needle);
}

function copyValues(html, attr) {
  const values = [];
  const tagPattern = /<button\b[\s\S]*?>/gi;
  for (const tagMatch of html.matchAll(tagPattern)) {
    const tag = tagMatch[0];
    if (!tag.includes(attr)) continue;
    const valueMatch = tag.match(/\sdata-copy-value=(["'])([\s\S]*?)\1/i);
    if (valueMatch) values.push(normalized(valueMatch[2]));
  }
  return values;
}

function hrefValues(html) {
  return [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => normalized(match[1]));
}

function requireText(failures, pageKey, html, label, value) {
  if (!pageContains(html, value)) failures.push(`${pageKey}:missing_value:${label}:${String(value || "none").slice(0, 140)}`);
}

function requireCopyValue(failures, pageKey, copyValueSet, label, value) {
  if (!copyValueSet.has(normalized(value))) failures.push(`${pageKey}:missing_copy_value:${label}:${String(value || "none").slice(0, 140)}`);
}

function requireHref(failures, pageKey, hrefSet, label, value) {
  if (!hrefSet.has(normalized(value))) failures.push(`${pageKey}:missing_href:${label}:${String(value || "none").slice(0, 140)}`);
}

function validateNoorSprintVariantLink(failures, pageKey, variant) {
  const expected = {
    parent_group: {
      linkPath: "/share/noor",
      sourceId: "noor_first_subscriber_sprint_parent_group",
      placement: "parent_group",
    },
    direct_dm: {
      linkPath: "/share/noor",
      sourceId: "noor_first_subscriber_sprint_direct_dm",
      placement: "direct_dm",
    },
    worksheet_followup: {
      linkPath: "/product-samples/noor-worksheet",
      sourceId: "noor_first_subscriber_sprint_worksheet_followup",
      placement: "worksheet_followup",
      storyLinkPath: "/share/noor",
      storySourceId: "noor_first_subscriber_sprint_worksheet_followup_story",
      storyPlacement: "worksheet_followup_story",
    },
    pdf_sample_followup: {
      linkPath: "/downloads/noor-worksheet-sample.pdf",
      sourceId: "noor_first_subscriber_sprint_pdf_sample_followup",
      placement: "pdf_sample_followup",
      storyLinkPath: "/share/noor",
      storySourceId: "noor_first_subscriber_sprint_pdf_sample_story",
      storyPlacement: "pdf_sample_story",
    },
  }[variant.id];
  if (!expected) return;
  if (!variant.link?.includes(`${expected.linkPath}?source_id=${expected.sourceId}`)) {
    failures.push(`${pageKey}:noor_sprint_variant_bad_link:${variant.id || "none"}`);
  }
  if (!variant.link?.includes("creator=fursay")) failures.push(`${pageKey}:noor_sprint_variant_missing_creator:${variant.id || "none"}`);
  if (!variant.link?.includes(`placement=${expected.placement}`)) failures.push(`${pageKey}:noor_sprint_variant_bad_placement:${variant.id || "none"}`);
  if (!variant.copy?.includes(variant.link || "missing")) failures.push(`${pageKey}:noor_sprint_variant_copy_missing_link:${variant.id || "none"}`);
  if (expected.storyLinkPath) {
    if (!variant.storyLink?.includes(`${expected.storyLinkPath}?source_id=${expected.storySourceId}`)) {
      failures.push(`${pageKey}:noor_sprint_variant_bad_story_link:${variant.id || "none"}`);
    }
    if (!variant.storyLink?.includes("creator=fursay")) failures.push(`${pageKey}:noor_sprint_variant_story_missing_creator:${variant.id || "none"}`);
    if (!variant.storyLink?.includes(`placement=${expected.storyPlacement}`)) failures.push(`${pageKey}:noor_sprint_variant_bad_story_placement:${variant.id || "none"}`);
    if (!variant.copy?.includes(variant.storyLink || "missing")) failures.push(`${pageKey}:noor_sprint_variant_copy_missing_story_link:${variant.id || "none"}`);
  }
}

function validateManifestBasics(key, manifest, html, failures) {
  if (manifest.site !== "Fursay") failures.push(`${key}:bad_site:${manifest.site || "none"}`);
  if (manifest.origin !== "https://fursay.com") failures.push(`${key}:bad_origin:${manifest.origin || "none"}`);
  if (manifest.platform !== "cloudflare-workers-static-assets") failures.push(`${key}:bad_platform:${manifest.platform || "none"}`);
  if (manifest.safety?.subscriptionEndpoint !== "/api/subscribe") failures.push(`${key}:bad_subscription_endpoint`);
  if (manifest.safety?.smokeSubmitsToMailerLite !== false) failures.push(`${key}:bad_smoke_contract`);
  if (!html.includes(`href="/${key}.json"`)) failures.push(`${key}:page_missing_json_link`);
  if (!html.includes("<h1>")) failures.push(`${key}:page_missing_h1`);
}

function validateLinks(manifest, html, failures) {
  const pageKey = "links";
  const hrefSet = new Set(hrefValues(html));
  const copySet = new Set(copyValues(html, "data-copy-share-kit"));
  validateManifestBasics(pageKey, manifest, html, failures);
  if (manifest.primaryRoute !== "https://fursay.com/links") failures.push("links:bad_primary_route");
  if (manifest.safety?.primaryLinksUseTrackedShortlinks !== true) failures.push("links:missing_tracked_shortlink_contract");
  if (copySet.size !== 6) failures.push(`links:copy_button_count:${copySet.size}`);

  for (const [pack, item] of Object.entries(manifest.packs || {})) {
    requireText(failures, pageKey, html, `${pack}:title`, item.title);
    requireText(failures, pageKey, html, `${pack}:description`, item.description);
    requireHref(failures, pageKey, hrefSet, `${pack}:primary`, item.primaryAction?.url);
    requireHref(failures, pageKey, hrefSet, `${pack}:secondary`, item.secondaryAction?.url);
    requireHref(failures, pageKey, hrefSet, `${pack}:youtube`, item.youtube);
    requireCopyValue(failures, pageKey, copySet, `${pack}:primary`, item.primaryAction?.url);
    requireCopyValue(failures, pageKey, copySet, `${pack}:secondary`, item.secondaryAction?.url);
    requireCopyValue(failures, pageKey, copySet, `${pack}:youtube`, item.youtube);
    requireText(failures, pageKey, html, `${pack}:primary_label`, item.primaryAction?.label);
    requireText(failures, pageKey, html, `${pack}:secondary_label`, item.secondaryAction?.label);
    if (item.primaryAction?.pack !== pack) failures.push(`links:${pack}:bad_primary_pack:${item.primaryAction?.pack || "none"}`);
    if (item.primaryAction?.attribution?.utm_content !== `sample_${pack}`) {
      failures.push(`links:${pack}:bad_primary_content:${item.primaryAction?.attribution?.utm_content || "none"}`);
    }
  }

  for (const [key, item] of Object.entries(manifest.operations || {})) {
    requireHref(failures, pageKey, hrefSet, `operation:${key}`, item.url);
    requireText(failures, pageKey, html, `operation_label:${key}`, item.label);
  }
}

function validateShareKit(manifest, html, failures) {
  const pageKey = "share-kit";
  const hrefSet = new Set(hrefValues(html));
  const copySet = new Set(copyValues(html, "data-copy-share-kit"));
  validateManifestBasics(pageKey, manifest, html, failures);
  if (manifest.safety?.linksUseShortlinksWithUtmRedirects !== true) failures.push("share-kit:missing_shortlink_contract");
  if (manifest.safety?.shortlinkManifest !== "https://fursay.com/shortlinks.json") failures.push("share-kit:bad_shortlink_manifest");
  if (copySet.size !== 28) failures.push(`share-kit:copy_button_count:${copySet.size}`);

  for (const [pack, item] of Object.entries(manifest.packs || {})) {
    const expectedSamplePreviewPath = pack === "koko" ? "/product-samples/koko-printable" : "/product-samples/noor-worksheet";
    const expectedSampleDownloadPath = pack === "koko" ? "/downloads/koko-printable-sample.pdf" : "/downloads/noor-worksheet-sample.pdf";
    const values = {
      title: item.title,
      storyWorld: item.storyWorld,
      sampleShortlink: item.sampleShortlink,
      familyShareShortlink: item.familyShareShortlink,
      productSamplePreviewUrl: item.productSamplePreviewUrl,
      productSampleDownloadUrl: item.productSampleDownloadUrl,
      bioShortlink: item.bioShortlink,
      creatorShortlink: item.creatorShortlink,
      whatsappShareUrl: item.whatsappShareUrl,
      lineShareUrl: item.lineShareUrl,
      sampleQrSvg: item.sampleQrSvg,
      shareQrSvg: item.shareQrSvg,
      familyShareMessage: item.familyShareMessage,
      bioProfileCopy: item.bioProfileCopy,
      shortHeadline: item.shortHeadline,
    };
    for (const [label, value] of Object.entries(values)) requireText(failures, pageKey, html, `${pack}:${label}`, value);
    for (const label of ["storyWorld", "sampleShortlink", "familyShareShortlink", "productSamplePreviewUrl", "productSampleDownloadUrl", "bioShortlink", "creatorShortlink", "whatsappShareUrl", "lineShareUrl", "sampleQrSvg", "shareQrSvg", "familyShareMessage", "bioProfileCopy", "shortHeadline"]) {
      requireCopyValue(failures, pageKey, copySet, `${pack}:${label}`, values[label]);
    }
    for (const label of ["storyWorld", "sampleShortlink", "familyShareShortlink", "productSamplePreviewUrl", "productSampleDownloadUrl", "bioShortlink", "creatorShortlink", "sampleQrSvg", "shareQrSvg"]) {
      requireHref(failures, pageKey, hrefSet, `${pack}:${label}`, values[label]);
    }
    if (!item.productSamplePreviewUrl?.includes(`${expectedSamplePreviewPath}?source_id=${pack}_share_kit_sample_preview`)) {
      failures.push(`share-kit:${pack}:bad_product_sample_preview:${item.productSamplePreviewUrl || "none"}`);
    }
    if (!item.productSampleDownloadUrl?.includes(`${expectedSampleDownloadPath}?source_id=${pack}_share_kit_pdf_sample`)) {
      failures.push(`share-kit:${pack}:bad_product_sample_download:${item.productSampleDownloadUrl || "none"}`);
    }
    for (const [label, value] of Object.entries({
      productSamplePreviewUrl: item.productSamplePreviewUrl,
      productSampleDownloadUrl: item.productSampleDownloadUrl,
    })) {
      if (!value?.includes("creator=fursay")) failures.push(`share-kit:${pack}:${label}:missing_creator`);
      if (!value?.includes(label === "productSamplePreviewUrl" ? "placement=share_kit_sample_preview" : "placement=share_kit_pdf_sample")) {
        failures.push(`share-kit:${pack}:${label}:bad_placement`);
      }
    }
    if (item.attribution?.utm_campaign !== `${pack === "koko" ? "koko" : "noor"}_story_funnel`) {
      failures.push(`share-kit:${pack}:bad_campaign:${item.attribution?.utm_campaign || "none"}`);
    }
    if (item.attribution?.utm_content !== `share_sample_${pack}`) {
      failures.push(`share-kit:${pack}:bad_content:${item.attribution?.utm_content || "none"}`);
    }
  }
}

function validateTrafficLaunch(manifest, html, failures) {
  const pageKey = "traffic-launch";
  const hrefSet = new Set(hrefValues(html));
  const copySet = new Set(copyValues(html, "data-copy-traffic-launch"));
  validateManifestBasics(pageKey, manifest, html, failures);
  if (manifest.safety?.creatorKitManifest !== "https://fursay.com/creator-kit.json") failures.push("traffic-launch:bad_creator_manifest");
  if (manifest.safety?.shareKitManifest !== "https://fursay.com/share-kit.json") failures.push("traffic-launch:bad_share_manifest");
  if (manifest.safety?.shortlinkManifest !== "https://fursay.com/shortlinks.json") failures.push("traffic-launch:bad_shortlink_manifest");
  if (copySet.size !== 15) failures.push(`traffic-launch:copy_button_count:${copySet.size}`);

  const noorSprint = manifest.activationSprints?.noorFirstSubscriber || {};
  for (const [label, value] of Object.entries({
    status: noorSprint.status,
    goal: noorSprint.goal,
    successMetric: noorSprint.successMetric,
    primaryLink: noorSprint.primaryLink,
    sampleLink: noorSprint.sampleLink,
    worksheetPreview: noorSprint.worksheetPreview,
    copy: noorSprint.copy,
  })) {
    requireText(failures, pageKey, html, `noor_sprint:${label}`, value);
  }
  for (const label of ["primaryLink", "sampleLink", "worksheetPreview"]) {
    requireHref(failures, pageKey, hrefSet, `noor_sprint:${label}`, noorSprint[label]);
  }
  requireCopyValue(failures, pageKey, copySet, "noor_sprint:copy", noorSprint.copy);
  if (noorSprint.pack !== "noor") failures.push(`traffic-launch:noor_sprint_bad_pack:${noorSprint.pack || "none"}`);
  if (noorSprint.windowDays !== 7) failures.push(`traffic-launch:noor_sprint_bad_window:${noorSprint.windowDays || "none"}`);
  if (!Array.isArray(noorSprint.copyVariants) || noorSprint.copyVariants.length !== 4) {
    failures.push(`traffic-launch:noor_sprint_variant_count:${noorSprint.copyVariants?.length || 0}`);
  }
  for (const variant of noorSprint.copyVariants || []) {
    requireText(failures, pageKey, html, `noor_sprint:variant:${variant.id}:label`, variant.label);
    requireText(failures, pageKey, html, `noor_sprint:variant:${variant.id}:link`, variant.link);
    requireText(failures, pageKey, html, `noor_sprint:variant:${variant.id}:copy`, variant.copy);
    requireHref(failures, pageKey, hrefSet, `noor_sprint:variant:${variant.id}:link`, variant.link);
    requireCopyValue(failures, pageKey, copySet, `noor_sprint:variant:${variant.id}:copy`, variant.copy);
    if (!["parent_group", "direct_dm", "worksheet_followup", "pdf_sample_followup"].includes(variant.id)) {
      failures.push(`traffic-launch:noor_sprint_unknown_variant:${variant.id || "none"}`);
    }
    validateNoorSprintVariantLink(failures, pageKey, variant);
    if (variant.storyLink) {
      requireText(failures, pageKey, html, `noor_sprint:variant:${variant.id}:storyLink`, variant.storyLink);
      requireHref(failures, pageKey, hrefSet, `noor_sprint:variant:${variant.id}:storyLink`, variant.storyLink);
    }
  }
  for (const checkpoint of noorSprint.checklist || []) requireText(failures, pageKey, html, "noor_sprint:checklist", checkpoint);

  for (const [pack, item] of Object.entries(manifest.packs || {})) {
    for (const [label, value] of Object.entries({
      title: item.title,
      storyWorld: item.storyWorld,
      sampleShortlink: item.sampleShortlink,
      shareShortlink: item.shareShortlink,
      creatorShortlink: item.creatorShortlink,
      sourceIdExample: item.sourceIdExample,
    })) {
      requireText(failures, pageKey, html, `${pack}:${label}`, value);
    }
    for (const label of ["storyWorld", "sampleShortlink", "shareShortlink", "creatorShortlink"]) {
      requireHref(failures, pageKey, hrefSet, `${pack}:${label}`, item[label]);
    }
    if (!Array.isArray(item.channels) || item.channels.length !== 5) failures.push(`traffic-launch:${pack}:channel_count:${item.channels?.length || 0}`);
    for (const channel of item.channels || []) {
      for (const [label, value] of Object.entries({
        label: channel.label,
        link: channel.link,
        linkTemplate: channel.linkTemplate,
        exampleUrl: channel.exampleUrl,
        copy: channel.copy,
        publishCopyTemplate: channel.publishCopyTemplate,
        checkpoint: channel.checkpoint,
      })) {
        requireText(failures, pageKey, html, `${pack}:${channel.channel}:${label}`, value);
      }
      requireCopyValue(failures, pageKey, copySet, `${pack}:${channel.channel}:publishCopyTemplate`, channel.publishCopyTemplate);
      if (channel.link.startsWith("https://fursay.com/images/")) {
        requireText(failures, pageKey, html, `${pack}:${channel.channel}:asset_link`, channel.link);
      } else {
        requireHref(failures, pageKey, hrefSet, `${pack}:${channel.channel}:link`, channel.link);
      }
      requireHref(failures, pageKey, hrefSet, `${pack}:${channel.channel}:exampleUrl`, channel.exampleUrl);
      if (!channel.attribution?.utm_source || !channel.attribution?.utm_content) {
        failures.push(`traffic-launch:${pack}:${channel.channel}:missing_attribution`);
      }
    }
    for (const checkpoint of item.preflightChecklist || []) requireText(failures, pageKey, html, `${pack}:checklist`, checkpoint);
  }
}

async function main() {
  const args = parseArgs();
  const failures = [];
  const pages = [];

  for (const spec of MANIFESTS) {
    const manifest = await readJson(args.baseUrl, spec.json);
    const html = await readText(args.baseUrl, spec.page);
    if (spec.key === "links") validateLinks(manifest, html, failures);
    if (spec.key === "share-kit") validateShareKit(manifest, html, failures);
    if (spec.key === "traffic-launch") validateTrafficLaunch(manifest, html, failures);
    pages.push({
      key: spec.key,
      json: spec.json,
      page: spec.page,
      htmlBytes: Buffer.byteLength(html),
      sourceCommit: manifest.source?.commit || "",
    });
  }

  await mkdir(args.outDir, { recursive: true });
  const report = {
    ok: failures.length === 0,
    mode: args.baseUrl ? "live" : "local",
    baseUrl: args.baseUrl || "",
    failures,
    pages,
  };
  await writeFile(resolve(args.outDir, "public-kit-parity.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({
    ok: report.ok,
    mode: report.mode,
    outDir: args.outDir,
    failed: failures.length,
    pages: pages.length,
  }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
