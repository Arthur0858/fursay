export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
      return new Response(null, { headers: corsHeaders() });
    }

    if (url.pathname === "/api/subscribe" && request.method === "POST") {
      return handleSubscribe(request, env);
    }

    if (url.pathname.endsWith(".html")) {
      const cleanPath = url.pathname.replace(/\/index\.html$/, "/").replace(/\.html$/, "");
      return withSecurityHeaders(Response.redirect(`${url.origin}${cleanPath}${url.search}`, 301));
    }

    return serveAsset(request, env);
  }
};

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
    headers.set("Cache-Control", "public, max-age=300, must-revalidate");
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
    const body = await request.json();
    const { email, groups, child_age, region, attribution } = body;

    if (!email || !email.includes("@")) {
      return json({ success: false, message: "Invalid email" }, 400, headers);
    }

    const groupIds = [env.MAILERLITE_GROUP_FURSAY_ALL].filter(Boolean);
    if (Array.isArray(groups)) {
      if (groups.includes("koko") && env.MAILERLITE_GROUP_KOKO) {
        groupIds.push(env.MAILERLITE_GROUP_KOKO);
      }
      if (groups.includes("noor") && env.MAILERLITE_GROUP_NOOR) {
        groupIds.push(env.MAILERLITE_GROUP_NOOR);
      }
    }

    const fields = {};
    if (child_age) fields.child_age = child_age;
    if (region) fields.region = region;
    Object.assign(fields, attributionFields(attribution, env));

    const payload = {
      email,
      ...(groupIds.length ? { groups: groupIds } : {}),
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

  const fields = {};
  for (const [key, fieldName] of Object.entries(fieldNames)) {
    const value = cleanAttributionValue(attribution[key]);
    if (value) fields[fieldName] = value;
  }
  return fields;
}

function cleanAttributionValue(value) {
  if (typeof value !== "string") return "";
  return value.replace(/[\r\n\t]/g, " ").trim().slice(0, 180);
}
