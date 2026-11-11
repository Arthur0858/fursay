export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/favicon.ico") {
      return redirectWithHeaders(`${url.origin}/favicon.svg${url.search}`, 301);
    }

    if (url.pathname === "/en" || url.pathname === "/en/") {
      return redirectWithHeaders(`${url.origin}/${url.search}`, 301);
    }

    if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
      return withSecurityHeaders(new Response(null, { headers: corsHeaders() }));
    }

    if (url.pathname === "/api/subscribe") {
      if (request.method === "POST") return handleSubscribe(request, env);
      return json({ success: false, message: "Method not allowed" }, 405, corsHeaders());
    }

    if (url.pathname === "/api/event") {
      if (request.method === "POST") return handleEvent(request, env);
      return json({ success: false, message: "Method not allowed" }, 405, corsHeaders());
    }

    const goRedirect = goRedirectUrl(url);
    if (goRedirect) return redirectWithHeaders(goRedirect, 302);

    const sampleDownloadRedirect = sampleDownloadRedirectUrl(url, request, env);
    if (sampleDownloadRedirect) {
      return redirectWithHeaders(sampleDownloadRedirect, 302);
    }

    const joinRedirect = joinRedirectUrl(url);
    if (joinRedirect) {
      return redirectWithHeaders(joinRedirect, 302);
    }

    if (url.pathname.endsWith(".html")) {
      const cleanPath = url.pathname.replace(/\/index\.html$/, "/").replace(/\.html$/, "");
      return withSecurityHeaders(Response.redirect(`${url.origin}${cleanPath}${url.search}`, 301));
    }

    return serveAsset(request, env);
  }
};

function goRedirectUrl(url) {
  const path = url.pathname.replace(/\/+$/, "").toLowerCase();
  if (path !== "/go" && !path.startsWith("/go/")) return null;
  const goRoutes = {
    "/go/koko-sample": "/download/koko-printable-sample",
    "/go/noor-sample": "/download/noor-worksheet-sample",
    "/go/koko-newsletter": "/join/koko", "/go/koko": "/join/koko",
    "/go/noor-newsletter": "/join/noor", "/go/noor": "/join/noor"
  };
  const route = goRoutes[path];
  if (route?.startsWith("/join/")) return joinRedirectUrl(new URL(route + url.search, url.origin));
  const target = new URL(route || "/", url.origin);
  if (!route) {
    target.searchParams.set("utm_source", "shortlink");
    target.searchParams.set("utm_medium", "direct");
    target.searchParams.set("utm_campaign", "go");
    target.searchParams.set("utm_content", path === "/go" ? "go_root" : "go_unknown");
  }
  copyShortlinkPassthroughParams(url, target);
  return target.toString();
}

function sampleDownloadRedirectUrl(url, request, env) {
  const path = url.pathname.replace(/\/+$/, "").toLowerCase();
  const downloadRoutes = {
    "/download/koko-printable-sample": {
      target: "/downloads/koko-printable-sample.pdf",
      pack: "koko",
      campaign: "koko_story_funnel",
      signupSource: "koko_tracked_pdf_sample",
    },
    "/download/noor-worksheet-sample": {
      target: "/downloads/noor-worksheet-sample.pdf",
      pack: "noor",
      campaign: "noor_story_funnel",
      signupSource: "noor_tracked_pdf_sample",
    },
  };
  const route = downloadRoutes[path];
  if (!route) return null;

  if (request.method === "GET") writeAnonymousEvent({
    event: "fursay_product_sample_download_request",
    detail: {
      path: url.pathname,
      page_pack: route.pack,
      campaign: route.campaign,
      pack: route.pack,
      signup_source: url.searchParams.get("signup_source") || route.signupSource,
      product_interest: route.pack,
      interest_stage: url.searchParams.get("interest_stage") || "direct_pdf_sample",
      source_id: url.searchParams.get("source_id") || "",
      creator: url.searchParams.get("creator") || "",
      placement: url.searchParams.get("placement") || "",
    },
  }, request, env);

  const target = new URL(route.target, url.origin);
  for (const key of SHORTLINK_PASSTHROUGH_PARAMS) {
    const value = url.searchParams.get(key);
    if (value) target.searchParams.set(key, value);
  }
  return target.toString();
}

function joinRedirectUrl(url) {
  const path = url.pathname.replace(/\/+$/, "").toLowerCase();
  const routes = {
    "/join/koko": {
      target: "/koko",
      pack: "koko",
      campaign: "koko_story_funnel",
      content: "join_koko"
    },
    "/join/noor": {
      target: "/arabic",
      pack: "noor",
      campaign: "noor_story_funnel",
      content: "join_noor"
    },
    "/sample/koko": {
      target: "/koko",
      pack: "koko",
      campaign: "koko_story_funnel",
      content: "sample_koko"
    },
    "/sample/noor": {
      target: "/arabic",
      pack: "noor",
      campaign: "noor_story_funnel",
      content: "sample_noor"
    },
    "/share/koko": {
      target: "/koko",
      pack: "koko",
      source: "family_share",
      medium: "share",
      campaign: "koko_story_funnel",
      content: "share_sample_koko"
    },
    "/share/noor": {
      target: "/arabic",
      pack: "noor",
      source: "family_share",
      medium: "share",
      campaign: "noor_story_funnel",
      content: "share_sample_noor"
    },
    "/bio/koko": {
      target: "/koko",
      pack: "koko",
      source: "social_profile",
      medium: "bio",
      campaign: "koko_story_funnel",
      content: "bio_koko"
    },
    "/bio/noor": {
      target: "/arabic",
      pack: "noor",
      source: "social_profile",
      medium: "bio",
      campaign: "noor_story_funnel",
      content: "bio_noor"
    },
    "/creator/koko": {
      target: "/koko",
      pack: "koko",
      source: "creator_kit",
      medium: "description",
      campaign: "koko_story_funnel",
      content: "creator_kit_sample"
    },
    "/creator/koko/youtube": {
      target: "/koko",
      pack: "koko",
      source: "youtube",
      medium: "description",
      campaign: "koko_story_funnel",
      content: "creator_kit_youtube"
    },
    "/creator/koko/social": {
      target: "/koko",
      pack: "koko",
      source: "social",
      medium: "profile",
      campaign: "koko_story_funnel",
      content: "creator_kit_social"
    },
    "/creator/koko/newsletter": {
      target: "/koko",
      pack: "koko",
      source: "newsletter",
      medium: "email",
      campaign: "koko_story_funnel",
      content: "creator_kit_newsletter"
    },
    "/creator/noor": {
      target: "/arabic",
      pack: "noor",
      source: "creator_kit",
      medium: "description",
      campaign: "noor_story_funnel",
      content: "creator_kit_sample"
    },
    "/creator/noor/youtube": {
      target: "/arabic",
      pack: "noor",
      source: "youtube",
      medium: "description",
      campaign: "noor_story_funnel",
      content: "creator_kit_youtube"
    },
    "/creator/noor/social": {
      target: "/arabic",
      pack: "noor",
      source: "social",
      medium: "profile",
      campaign: "noor_story_funnel",
      content: "creator_kit_social"
    },
    "/creator/noor/newsletter": {
      target: "/arabic",
      pack: "noor",
      source: "newsletter",
      medium: "email",
      campaign: "noor_story_funnel",
      content: "creator_kit_newsletter"
    }
  };
  const route = routes[path];
  if (!route) return null;

  const target = new URL(route.target, url.origin);
  target.searchParams.set("subscribe", route.pack);
  target.searchParams.set("utm_source", route.source || "shortlink");
  target.searchParams.set("utm_medium", route.medium || "direct");
  target.searchParams.set("utm_campaign", route.campaign);
  target.searchParams.set("utm_content", route.content);
  copyShortlinkPassthroughParams(url, target);
  return target.toString();
}

const SHORTLINK_PASSTHROUGH_PARAMS = ["utm_term", "ref", "source_id", "creator", "placement"];

function copyShortlinkPassthroughParams(source, target) {
  for (const key of SHORTLINK_PASSTHROUGH_PARAMS) {
    const value = source.searchParams.get(key);
    if (value) target.searchParams.set(key, value);
  }
}

function redirectWithHeaders(location, status) {
  const response = Response.redirect(location, status);
  const next = withSecurityHeaders(response);
  const headers = new Headers(next.headers);
  headers.set("Cache-Control", "public, max-age=300, must-revalidate");
  return new Response(next.body, {
    status: next.status,
    statusText: next.statusText,
    headers
  });
}

export function trialLanguageHref(href, requestUrl) {
  const page = new URL(requestUrl);
  const match = page.pathname.match(/^\/(?:zh\/|ar\/)?trials\/(koko|noor)-week-one(?:\.html)?\/?$/);
  if (!match) return null;
  let target;
  try { target = new URL(href, page); } catch { return null; }
  if (target.origin !== page.origin || !new RegExp(`^/(?:zh/|ar/)?trials/${match[1]}-week-one/?$`).test(target.pathname)) return null;
  let changed = false;
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "source_id"]) {
    const value = page.searchParams.get(key);
    if (value && /^[a-z0-9_-]{1,80}$/i.test(value)) { target.searchParams.set(key, value); changed = true; }
  }
  return changed ? target.toString() : null;
}

function withTrialLanguageAttribution(response, request) {
  // Query-specific HTML must not share an attributed response with another source.
  if (response.status !== 200 || !trialLanguageHref(new URL(request.url).pathname.replace(/\.html$/, "").replace(/\/$/, ""), request.url)) return response;
  const rewritten = new HTMLRewriter().on(".brand-language a", {
    element(element) {
      const href = trialLanguageHref(element.getAttribute("href") || "", request.url);
      if (href) element.setAttribute("href", href);
    }
  }).transform(response);
  const headers = new Headers(rewritten.headers);
  headers.set("Cache-Control", "private, no-store");
  headers.delete("ETag");
  headers.delete("Content-Length");
  return new Response(rewritten.body, {status: rewritten.status, statusText: rewritten.statusText, headers});
}

async function serveAsset(request, env) {
  const first = await env.ASSETS.fetch(request);
  if (first.status !== 404) return withTrialLanguageAttribution(withAssetHeaders(first, request), request);

  const url = new URL(request.url);
  if (/\.[^/]+$/.test(url.pathname)) {
    return withAssetHeaders(first, request);
  }

  const htmlUrl = new URL(request.url);
  htmlUrl.pathname = url.pathname.endsWith("/") ? `${url.pathname}index.html` : `${url.pathname}.html`;
  const htmlRequest = new Request(htmlUrl, request);
  const html = await env.ASSETS.fetch(htmlRequest);
  if (html.status === 404 && !url.pathname.endsWith("/")) {
    const candidate = new URL(request.url);
    candidate.pathname = `${url.pathname}/index.html`;
    const indexAsset = await env.ASSETS.fetch(new Request(candidate, request));
    if (indexAsset.status === 200) return redirectWithHeaders(`${url.origin}${url.pathname}/${url.search}`, 301);
  }
  if (html.status === 404 && url.pathname !== "/" && url.pathname.endsWith("/")) {
    const cleanPath = url.pathname.replace(/\/+$/, "");
    const candidate = new URL(request.url);
    candidate.pathname = `${cleanPath}.html`;
    const cleanAsset = await env.ASSETS.fetch(new Request(candidate, request));
    if (cleanAsset.status === 200) return redirectWithHeaders(`${url.origin}${cleanPath}${url.search}`, 301);
  }
  return withTrialLanguageAttribution(withAssetHeaders(html.status === 404 ? first : html, request), request);
}

function withAssetHeaders(response, request) {
  const next = withSecurityHeaders(response);
  const url = new URL(request.url);
  const headers = new Headers(next.headers);
  const path = url.pathname;
  const noindexFollowPaths = new Set(["/links", "/links.html"]);
  const noindexPaths = new Set([
    "/links.json",
    "/share-kit", "/share-kit.html", "/share-kit.json",
    "/creator-kit", "/creator-kit.html", "/creator-kit.json",
    "/traffic-launch", "/traffic-launch.html", "/traffic-launch.json",
    "/noor-sprint-status", "/noor-sprint-status.html", "/noor-sprint-status.json", "/noor-sprint-action.json",
    "/deploy-readiness", "/deploy-readiness.html", "/deploy-readiness.json",
    "/conversion-health", "/conversion-health.html", "/conversion-health.json",
    "/monetization-roadmap", "/monetization-roadmap.html", "/monetization-roadmap.json",
    "/adsense-readiness.json",
    "/product-samples/koko-printable", "/product-samples/koko-printable.html",
    "/product-samples/noor-worksheet", "/product-samples/noor-worksheet.html",
    ...["zh", "ar"].flatMap(locale => ["koko-printable", "noor-worksheet"].flatMap(slug => [`/${locale}/product-samples/${slug}`, `/${locale}/product-samples/${slug}.html`])),
  ]);

  if (noindexFollowPaths.has(path)) headers.set("X-Robots-Tag", "noindex, follow");
  else if (noindexPaths.has(path) || path.toLowerCase().endsWith(".json")) headers.set("X-Robots-Tag", "noindex, nofollow");

  if (path === "/" || path.endsWith(".html") || !/\.[^/]+$/.test(path)) {
    headers.set("Cache-Control", "public, max-age=300, must-revalidate");
  } else if (response.status >= 400) {
    headers.set("Cache-Control", "no-store");
  } else if (/\.(?:css|js)$/i.test(path)) {
    if ((response.status === 200 || response.status === 206 || response.status === 304) && (url.searchParams.has("v") || /-\d{8}-[a-z0-9-]+\.(?:css|js)$/i.test(path))) {
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
    } else {
      headers.set("Cache-Control", "public, max-age=300, must-revalidate");
    }
  } else if (/\.(?:avif|webp|png|jpg|jpeg|gif|svg|ico|woff2?)$/i.test(path)) {
    headers.set("Cache-Control", response.status === 200 || response.status === 206 || response.status === 304
      ? "public, max-age=31536000, immutable"
      : "public, max-age=300, must-revalidate");
  } else if (/\.(?:xml|txt|json)$/i.test(path)) {
    headers.set("Cache-Control", "public, max-age=3600");
  }

  return new Response(next.body, {
    status: next.status,
    statusText: next.statusText,
    headers
  });
}

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  const contentType = headers.get("Content-Type");
  if (contentType) {
    const [mediaType] = contentType.split(";");
    const type = mediaType.trim().toLowerCase();
    if (type === "text/html") {
      headers.set("Content-Type", "text/html; charset=utf-8");
    } else if (["text/css", "text/javascript", "application/javascript", "application/xml", "text/plain"].includes(type) && !/;\s*charset\s*=/i.test(contentType)) {
      headers.set("Content-Type", `${contentType}; charset=utf-8`);
    }
  }
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set("X-Frame-Options", "SAMEORIGIN");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

async function handleSubscribe(request, env) {
  const headers = corsHeaders();
  const logContext = { groups_count: 0, region: "unknown" };
  const log = (level, event, status, extra = {}) => {
    console[level](JSON.stringify({ event, status, ...logContext, ...extra }));
  };

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ success: false, message: "Invalid request" }, 400, headers);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ success: false, message: "Invalid request" }, 400, headers);
    }
    const { email, groups, region, attribution, website } = body;
    if (typeof website === "string" && website.length > 0) {
      log("log", "subscribe_honeypot", 200);
      return json({ success: true, pending: true, status: "pending" }, 200, headers);
    }
    const normalizedEmail = typeof email === "string" ? email.trim() : "";

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      return json({ success: false, message: "Invalid email" }, 400, headers);
    }

    // Turnstile runs after the honeypot and email checks and before any MailerLite call.
    const turnstile = await verifyTurnstile(body, request, env);
    if (!turnstile.ok) {
      log("log", "subscribe_turnstile_rejected", turnstile.status, { reason: turnstile.reason });
      return json({
        success: false,
        message: turnstile.status === 503 ? "Verification temporarily unavailable. Please try again." : "Verification failed. Please try again.",
        field: "cf-turnstile-response"
      }, turnstile.status, headers);
    }

    // Log only a bounded region code, never arbitrary request/provider text.
    if (typeof region === "string" && /^[A-Z]{2}$/.test(region)) logContext.region = region;
    const groupVars = ["MAILERLITE_GROUP_FURSAY_ALL"];
    if (Array.isArray(groups) && groups.includes("koko")) groupVars.push("MAILERLITE_GROUP_KOKO");
    if (Array.isArray(groups) && groups.includes("noor")) groupVars.push("MAILERLITE_GROUP_NOOR");
    const missing = groupVars.filter((name) => !env[name]);
    const groupIds = new Set(groupVars.map((name) => env[name]).filter(Boolean));
    logContext.groups_count = groupIds.size;
    if (missing.length) {
      log("error", "subscribe_config_missing", "partial", { missing });
    }

    const fields = {};
    if (region) fields.region = region;
    Object.assign(fields, attributionFields(attribution, env));
    Object.assign(fields, subscriberAttribution(body, request, env));

    const payload = {
      email: normalizedEmail,
      ...(groupIds.size ? { groups: [...groupIds] } : {}),
      ...(Object.keys(fields).length ? { fields } : {})
    };

    const apiToken = env.MAILERLITE_API_TOKEN || env.MAILERLITE_API_KEY;
    if (!apiToken) {
      log("error", "subscribe_config_missing", 500, { missing: ["MAILERLITE_API_TOKEN", "MAILERLITE_API_KEY"] });
      return json({ success: false, message: "Subscription is not configured" }, 500, headers);
    }

    const providerHeaders = {
      "Authorization": `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    };
    const response = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: providerHeaders,
      body: JSON.stringify(payload)
    });

    let pending = false;
    if (response.status === 409) {
      // A conflict does not prove that the requested memberships exist.
      // Fall back to the encoded email when the conflict has no subscriber ID.
      const existing = await response.json().catch(() => null);
      pending = existing?.data?.status !== "active";
      const subscriberId = existing?.data?.id;
      const subscriber = typeof subscriberId === "string" && subscriberId
        ? subscriberId
        : typeof subscriberId === "number" && Number.isFinite(subscriberId)
          ? String(subscriberId)
          : normalizedEmail;
      let assignmentFailed = false;
      for (const groupId of groupIds) {
        try {
          const assigned = await fetch(`https://connect.mailerlite.com/api/subscribers/${encodeURIComponent(subscriber)}/groups/${encodeURIComponent(groupId)}`, {
            method: "POST",
            headers: providerHeaders
          });
          if (!assigned.ok) assignmentFailed = true;
          log(assigned.ok ? "log" : "error", "subscribe_group_assignment", assigned.status);
        } catch {
          assignmentFailed = true;
          log("error", "subscribe_group_assignment", "network_error");
        }
      }
      if (assignmentFailed) return json({ success: false }, 502, headers);
    } else if (!response.ok) {
      log("error", "subscribe_provider_failed", response.status);
      return json({ success: false, message: "Subscription failed" }, 502, headers);
    } else {
      const result = await response.json().catch(() => null);
      pending = result?.data?.status === "unconfirmed";
    }

    log("log", "subscribe_completed", response.status);
    return json({ success: true, pending, status: missing.length ? "partial" : pending ? "pending" : "subscribed", ...(missing.length ? { partial: true } : {}) }, 200, headers);
  } catch {
    log("error", "subscribe_error", 500);
    return json({ success: false, message: "Subscription failed" }, 500, headers);
  }
}

const TURNSTILE_SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TURNSTILE_ACTION = "subscribe";
const DEFAULT_TURNSTILE_HOSTNAMES = ["fursay.com", "www.fursay.com"];

/**
 * Server-side Turnstile check for /api/subscribe.
 * Safe-off: without the TURNSTILE_SECRET_KEY Worker secret it returns { ok: true, skipped: true }
 * and the subscribe flow is unchanged. With the secret it fails closed:
 * missing/oversized token or a failed check -> 403, siteverify unreachable or non-2xx -> 503.
 * TURNSTILE_HOSTNAMES (optional, comma-separated) overrides the accepted frontend hostnames.
 */
export async function verifyTurnstile(body, request, env) {
  const secret = typeof env?.TURNSTILE_SECRET_KEY === "string" ? env.TURNSTILE_SECRET_KEY.trim() : "";
  if (!secret) return { ok: true, skipped: true };

  const token = body ? body["cf-turnstile-response"] : undefined;
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) {
    return { ok: false, status: 403, reason: "missing_token" };
  }
  const configured = typeof env.TURNSTILE_HOSTNAMES === "string"
    ? env.TURNSTILE_HOSTNAMES.split(",").map((host) => host.trim().toLowerCase()).filter(Boolean)
    : [];
  const hostnames = new Set(configured.length ? configured : DEFAULT_TURNSTILE_HOSTNAMES);

  const form = new URLSearchParams({ secret, response: token });
  const remoteIp = request.headers.get("CF-Connecting-IP");
  if (remoteIp) form.set("remoteip", remoteIp);

  let result;
  try {
    const response = await fetch(TURNSTILE_SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error("siteverify_status");
    result = await response.json();
  } catch {
    return { ok: false, status: 503, reason: "siteverify_unavailable" };
  }
  if (!result || result.success !== true || result.action !== TURNSTILE_ACTION || !hostnames.has(String(result.hostname || "").toLowerCase())) {
    return { ok: false, status: 403, reason: "verification_failed" };
  }
  return { ok: true };
}

async function handleEvent(request, env) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ success: false, message: "Invalid request" }, 400, corsHeaders());
    }
    const event = sanitizeEvent(body);
    if (!event.event) return json({ success: false, message: "Invalid event" }, 400, corsHeaders());
    const sink = writeAnonymousEvent(event, request, env);
    console.log("Fursay anonymous event accepted");
    return json({ success: true, sink }, 200, corsHeaders());
  } catch (error) {
    console.error("Event intake failed");
    return json({ success: false, message: "Event intake failed" }, 500, corsHeaders());
  }
}

function writeAnonymousEvent(event, request, env) {
  event = sanitizeEvent(event);
  const binding = env?.FURSAY_EVENTS;
  if (!binding || typeof binding.writeDataPoint !== "function") return "worker_logs";

  try {
    const detail = event.detail || {};
    binding.writeDataPoint({
      indexes: [safeAnalyticsValue(detail.path || "/", 96)],
      blobs: [
        safeAnalyticsValue(event.event),
        safeAnalyticsValue(detail.path || "/"),
        safeAnalyticsValue(detail.locale),
        safeAnalyticsValue(detail.page_pack),
        safeAnalyticsValue(detail.campaign),
        safeAnalyticsValue(detail.pack),
        safeAnalyticsValue(detail.signup_source),
        safeAnalyticsValue(detail.market),
        safeAnalyticsValue(detail.product_id),
        safeAnalyticsValue(detail.outbound_host),
        safeAnalyticsValue(detail.outbound_path),
        safeAnalyticsValue(detail.copy_kind),
        safeAnalyticsValue(detail.product_interest),
        safeAnalyticsValue(detail.interest_stage),
        safeAnalyticsValue(request.cf?.colo || ""),
        safeAnalyticsValue(detail.source_id),
        safeAnalyticsValue(detail.creator),
        safeAnalyticsValue(detail.placement),
      ],
      doubles: [1],
    });
    return "analytics_engine";
  } catch (error) {
    console.error("Analytics Engine event write failed");
    return "worker_logs";
  }
}

function safeAnalyticsValue(value, limit = 180) {
  return String(value || "").replace(/[\r\n\t]/g, " ").trim().slice(0, limit);
}

function safeEventSlug(value, strict = false) {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(value) || (strict && value !== value.toLowerCase()) || /(?:\d[ _-]*){7}/.test(value)) return "";
  return value;
}

function safeEventPath(value) {
  if (typeof value !== "string" || value.length > 180) return "";
  const path = value.split(/[?#]/, 1)[0];
  if (!/^\/(?!\/)[a-z0-9_@./-]*$/i.test(path) || /(?:\d[ _-]*){7}/.test(path) || path.includes("..")) return "";
  return path;
}

function safeEventUrl(value) {
  if (typeof value !== "string" || value.length > 2048) return "";
  try {
    const url = new URL(value, "https://fursay.com");
    if (url.protocol !== "https:" || !["fursay.com", "www.fursay.com", "youtube.com", "www.youtube.com", "youtu.be", "amazon.com", "www.amazon.com", "books.com.tw", "www.books.com.tw"].includes(url.hostname) || url.port) return "";
    const path = safeEventPath(url.pathname);
    if (!path) return "";
    const params = new URLSearchParams();
    for (const name of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
      const values = url.searchParams.getAll(name);
      if (values.length === 1 && safeEventSlug(values[0], true)) params.set(name, values[0]);
    }
    return url.origin + path + (params.size ? `?${params}` : "");
  } catch { return ""; }
}

function sanitizeEvent(body) {
  const slugKeys = ["locale", "page_pack", "campaign", "pack", "signup_source", "market", "link_text", "link_content", "copy_kind", "product_interest", "interest_stage", "source_id", "creator", "placement"];
  const detail = {};
  const input = body?.detail && typeof body.detail === "object" && !Array.isArray(body.detail) ? body.detail : {};
  for (const key of slugKeys) {
    const value = safeEventSlug(input[key], ["source_id", "creator", "placement"].includes(key));
    if (value) detail[key] = value;
  }
  if (['0312527748','0316012491','0316450014','1452150141','0786809140','0805047905','0996099948','1419713108','B0DRVXFBMR','0010568432','0010661414','0010706003','0010785383','0010960916','0010985365'].includes(input.product_id)) detail.product_id = input.product_id;
  if (input.outbound_kind === "youtube") detail.outbound_kind = input.outbound_kind;
  for (const key of ["path", "outbound_path"]) {
    const value = safeEventPath(input[key]);
    if (value) detail[key] = value;
  }
  for (const key of ["link_url", "share_url"]) {
    const value = safeEventUrl(input[key]);
    if (value) detail[key] = value;
  }
  if (["youtube.com", "www.youtube.com", "youtu.be", "amazon.com", "www.amazon.com", "books.com.tw", "www.books.com.tw", "fursay.com", "www.fursay.com"].includes(input.outbound_host)) detail.outbound_host = input.outbound_host;
  return { event: safeEventSlug(body?.event), detail };
}

function json(data, status, headers) {
  return withSecurityHeaders(new Response(JSON.stringify(data), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json"
    }
  }));
}

function subscriberAttribution(body, request, env) {
  const clean = (value) => typeof value === "string"
    ? value.replace(/[\x00-\x1f\x7f-\x9f]/g, "").trim().slice(0, 255)
    : "";
  let referer;
  try {
    const candidate = new URL(request.headers.get("Referer"));
    if (candidate.origin === new URL(request.url).origin) referer = candidate;
  } catch {} // Missing or malformed attribution must never block signup.
  const fields = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign"]) {
    const value = clean(body[key]) || clean(referer?.searchParams.get(key));
    if (value) fields[key] = value;
  }
  const path = (value) => {
    value = clean(value);
    if (!value.startsWith("/") || value.startsWith("//")) return "";
    return clean(value.split(/[?#]/, 1)[0]);
  };
  const signupPage = path(body.signup_page) || path(referer?.pathname);
  if (env && ["1", "true", "yes"].includes(String(env.MAILERLITE_ENABLE_SIGNUP_LANGUAGE || "").toLowerCase())) {
    fields.signup_language = /^\/zh(?:\/|$)/.test(signupPage) ? "zh" : /^\/ar(?:\/|$)/.test(signupPage) ? "ar" : "en";
  }
  if (signupPage) fields.signup_page = `fursay.com${signupPage}`.slice(0, 255);
  return fields;
}

function attributionFields(attribution, env) {
  if (!env || !["1", "true", "yes"].includes(String(env.MAILERLITE_ENABLE_ATTRIBUTION_FIELDS || "").toLowerCase())) {
    return {};
  }
  if (!attribution || typeof attribution !== "object") return {};

  const fieldNames = {
    signup_source: env.MAILERLITE_FIELD_SIGNUP_SOURCE || "signup_source",
    landing_path: env.MAILERLITE_FIELD_LANDING_PATH || "landing_path",
    landing_locale: env.MAILERLITE_FIELD_LANDING_LOCALE || "landing_locale",
    referrer_host: env.MAILERLITE_FIELD_REFERRER_HOST || "referrer_host",
    utm_source: env.MAILERLITE_FIELD_UTM_SOURCE || "utm_source",
    utm_medium: env.MAILERLITE_FIELD_UTM_MEDIUM || "utm_medium",
    utm_campaign: env.MAILERLITE_FIELD_UTM_CAMPAIGN || "utm_campaign",
    utm_content: env.MAILERLITE_FIELD_UTM_CONTENT || "utm_content",
    utm_term: env.MAILERLITE_FIELD_UTM_TERM || "utm_term"
  };
  const optionalFieldNames = {
    subscribe_intent: env.MAILERLITE_FIELD_SUBSCRIBE_INTENT,
    entry_pack: env.MAILERLITE_FIELD_ENTRY_PACK,
    modal_preselect: env.MAILERLITE_FIELD_MODAL_PRESELECT,
    ref: env.MAILERLITE_FIELD_REF,
    source_id: env.MAILERLITE_FIELD_SOURCE_ID,
    creator: env.MAILERLITE_FIELD_CREATOR,
    placement: env.MAILERLITE_FIELD_PLACEMENT
  };

  const fields = {};
  for (const [key, fieldName] of Object.entries(fieldNames)) {
    const value = cleanAttributionValue(attribution[key]);
    if (value) fields[fieldName] = value;
  }
  for (const [key, fieldName] of Object.entries(optionalFieldNames)) {
    if (!fieldName) continue;
    const value = cleanAttributionValue(attribution[key]);
    if (value) fields[fieldName] = value;
  }
  return fields;
}

function cleanAttributionValue(value) {
  if (typeof value !== "string") return "";
  return value.replace(/[\r\n\t]/g, " ").trim().slice(0, 180);
}
