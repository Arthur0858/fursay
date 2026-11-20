(() => {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', 'G-4CVTMWFRQN', {anonymize_ip: true});
  const events = window.fursayEvents = window.fursayEvents || [];
  const originalPush = events.push;
  events.push = function (...items) {
    const result = originalPush.apply(this, items);
    for (const item of items) {
      if (item && item.event === 'fursay_subscribe_submit_success' && typeof window.gtag === 'function') window.gtag('event', 'generate_lead');
    }
    return result;
  };
  document.addEventListener('click', (event) => {
    const anchor = event.target.closest('a[href]');
    if (!anchor || typeof window.gtag !== 'function') return;
    const url = new URL(anchor.href, location.href);
    const host = url.hostname.toLowerCase();
    const checkout = host === 'gumroad.com' || host.endsWith('.gumroad.com');
    const affiliate = (url.origin === location.origin && /^\/go\/(?:amz|books)-/i.test(url.pathname)) || /(^|\.)(amazon\.[a-z.]+|amzn\.to|books\.com\.tw)$/.test(host);
    if (checkout || affiliate) window.gtag('event', checkout ? 'begin_checkout' : 'affiliate_click', {link_url: url.origin + url.pathname, page_path: location.pathname});
  });
})();
