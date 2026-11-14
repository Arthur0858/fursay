import { SHORT_META_DESCRIPTIONS } from "./short-meta-descriptions.mjs";

// Scope the stricter minimum to the audited pages; other sitemap pages keep their existing limits.
export function checkShortDescription(path, description) {
  if (!Object.hasOwn(SHORT_META_DESCRIPTIONS, path)) return [];
  const minimum = path.startsWith("/zh/") ? 80 : 110;
  const length = [...description].length;
  return length < minimum ? [`${path}:description_length:${length}`] : [];
}
