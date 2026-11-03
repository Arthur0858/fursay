// Locale-independent routes keep navigation on the same resource and stage.
export const localeRoutes = {
  home: { home: '/' },
  world: { koko: '/koko', arabic: '/arabic' },
  episode: { 'noor-greetings': '/episodes/noor-greetings', 'noor-colors': '/episodes/noor-colors' },
  product: { 'koko-printable': '/products/koko-printable', 'noor-worksheet': '/products/noor-worksheet' },
  sample: { 'koko-printable': '/product-samples/koko-printable', 'noor-worksheet': '/product-samples/noor-worksheet' },
  trial: { 'koko-week-one': '/trials/koko-week-one', 'noor-week-one': '/trials/noor-week-one' },
  guides: { index: '/guides' },
};
export function localeRoute(kind, resource, locale) {
  const route = localeRoutes[kind]?.[resource];
  if (!route || !['en', 'zh', 'ar'].includes(locale)) throw new Error(`Unknown locale route: ${kind}/${resource}/${locale}`);
  return `${locale === 'en' ? '' : `/${locale}`}${route}`;
}
export function localizeRoute(route, locale) {
  for (const [kind, resources] of Object.entries(localeRoutes)) {
    for (const [resource, value] of Object.entries(resources)) {
      if (value === route) return localeRoute(kind, resource, locale);
    }
  }
  return `${locale === 'en' ? '' : `/${locale}`}${route}`;
}
