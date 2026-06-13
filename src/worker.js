export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
      return withSecurityHeaders(new Response(null, { headers: corsHeaders() }));
    }

    if (url.pathname === "/api/subscribe") {
      if (request.method === "POST") return handleSubscribe(request, env);
      return json({ success: false, message: "Method not allowed" }, 405, corsHeaders());
    }

    if (url.pathname === "/api/event") {
      if (request.method === "POST") return handleEvent(request);
      return json({ success: false, message: "Method not allowed" }, 405, corsHeaders());
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

async function serveAsset(request, env) {
  const first = await env.ASSETS.fetch(request);
  if (first.status !== 404) return withAssetHeaders(first, request);

  const url = new URL(request.url);
  if (/\.[^/]+$/.test(url.pathname)) {
    return withAssetHeaders(first, request);
  }

  const htmlUrl = new URL(request.url);
  htmlUrl.pathname = url.pathname.endsWith("/") ? `${url.pathname}index.html` : `${url.pathname}.html`;
  const htmlRequest = new Request(htmlUrl, request);
  const html = await env.ASSETS.fetch(htmlRequest);
  return withAssetHeaders(html.status === 404 ? first : html, request);
}

function withAssetHeaders(response, request) {
  const next = withSecurityHeaders(response);
  const url = new URL(request.url);
  const headers = new Headers(next.headers);
  const path = url.pathname;

  if (path === "/" || path.endsWith(".html") || !/\.[^/]+$/.test(path)) {
    headers.set("Cache-Control", "public, max-age=300, must-revalidate");
  } else if (/\.(?:css|js)$/i.test(path)) {
    if (url.searchParams.has("v") || /-\d{8}-[a-z0-9-]+\.(?:css|js)$/i.test(path)) {
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
    } else {
      headers.set("Cache-Control", "public, max-age=300, must-revalidate");
    }
  } else if (/\.(?:avif|webp|png|jpg|jpeg|gif|svg|ico|woff2?)$/i.test(path)) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
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
    const { email, groups, child_age, region, attribution } = body;
    const normalizedEmail = typeof email === "string" ? email.trim() : "";

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      return json({ success: false, message: "Invalid email" }, 400, headers);
    }

    const groupIds = new Set([env.MAILERLITE_GROUP_FURSAY_ALL].filter(Boolean));
    if (Array.isArray(groups)) {
      if (groups.includes("koko") && env.MAILERLITE_GROUP_KOKO) {
        groupIds.add(env.MAILERLITE_GROUP_KOKO);
      }
      if (groups.includes("noor") && env.MAILERLITE_GROUP_NOOR) {
        groupIds.add(env.MAILERLITE_GROUP_NOOR);
      }
    }

    const fields = {};
    if (child_age) fields.child_age = child_age;
    if (region) fields.region = region;
    Object.assign(fields, attributionFields(attribution, env));

    const payload = {
      email: normalizedEmail,
      ...(groupIds.size ? { groups: [...groupIds] } : {}),
      ...(Object.keys(fields).length ? { fields } : {})
    };

    const apiToken = env.MAILERLITE_API_TOKEN || env.MAILERLITE_API_KEY;
    if (!apiToken) {
      console.error("Missing MailerLite API token");
      return json({ success: false, message: "Subscription is not configured" }, 500, headers);
    }

    const response = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok && response.status !== 409) {
      const detail = await response.text();
      console.error("MailerLite subscribe failed", response.status, detail);
      return json({ success: false, message: "Subscription failed" }, 502, headers);
    }

    return json({ success: true, message: "Subscribed!" }, 200, headers);
  } catch (error) {
    console.error("Subscribe error", error);
    return json({ success: false, message: "Subscription failed" }, 500, headers);
  }
}

async function handleEvent(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ success: false, message: "Invalid request" }, 400, corsHeaders());
    }
    const event = sanitizeEvent(body);
    if (!event.event) return json({ success: false, message: "Invalid event" }, 400, corsHeaders());
    console.log("Fursay anonymous event", JSON.stringify(event));
    return json({ success: true }, 200, corsHeaders());
  } catch (error) {
    console.error("Event intake failed", error);
    return json({ success: false, message: "Event intake failed" }, 500, corsHeaders());
  }
}

function sanitizeEvent(body) {
  const allowedDetailKeys = new Set([
    "path",
    "locale",
    "page_pack",
    "campaign",
    "pack",
    "signup_source",
    "market",
    "product_id",
    "outbound_host",
    "link_text",
    "share_url",
    "link_url",
    "copy_kind",
    "product_interest",
    "interest_stage"
  ]);
  const blocked = /email|name|phone|address|token|secret|password/i;
  const event = typeof body?.event === "string" ? body.event.replace(/[^a-z0-9_:-]/gi, "").slice(0, 80) : "";
  const detail = {};
  if (body?.detail && typeof body.detail === "object" && !Array.isArray(body.detail)) {
    for (const [key, value] of Object.entries(body.detail)) {
      if (!allowedDetailKeys.has(key) || blocked.test(key)) continue;
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        detail[key] = String(value).replace(/[\r\n\t]/g, " ").trim().slice(0, 180);
      }
    }
  }
  return {
    event,
    detail,
    ts: typeof body?.ts === "string" ? body.ts.slice(0, 40) : new Date().toISOString()
  };
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
