// Match the browser and Worker anonymous-event filters.
export function expectedEventSlug(value) {
  return typeof value === "string" && /^[a-z0-9][a-z0-9_-]{0,63}$/.test(value) && !/(?:\d[ _-]*){7}/.test(value) ? value : "";
}

export function expectedEventUrl(value) {
  if (typeof value !== "string" || value.length > 2048) return "";
  try {
    const url = new URL(value, "https://fursay.com");
    const path = url.pathname;
    if (url.protocol !== "https:" || !["fursay.com", "www.fursay.com", "youtube.com", "www.youtube.com", "youtu.be", "amazon.com", "www.amazon.com", "books.com.tw", "www.books.com.tw"].includes(url.hostname) || url.port || path.length > 180 || !/^\/(?!\/)[a-z0-9_@./-]*$/i.test(path) || /(?:\d[ _-]*){7}/.test(path) || path.includes("..")) return "";
    const params = new URLSearchParams();
    for (const name of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
      const values = url.searchParams.getAll(name);
      if (values.length === 1 && expectedEventSlug(values[0])) params.set(name, values[0]);
    }
    return url.origin + path + (params.size ? `?${params}` : "");
  } catch { return ""; }
}
