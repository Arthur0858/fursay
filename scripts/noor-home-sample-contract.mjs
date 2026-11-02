export function isNoorHomeSampleDirectPreview(value) {
  if (typeof value !== "string" || !value) return false;
  try {
    const url = new URL(value, "https://fursay.com");
    return url.origin === "https://fursay.com"
      && url.pathname === "/product-samples/noor-worksheet"
      && !url.searchParams.has("subscribe");
  } catch {
    return false;
  }
}
