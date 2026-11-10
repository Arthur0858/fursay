/* Fursay newsletter Turnstile helper (Managed widget "Fursay newsletter").
 * Loads Cloudflare Turnstile only when a sitekey is set, renders one widget per
 * subscribe form (modal + inline), and adds that form's token to the existing
 * /api/subscribe JSON request as "cf-turnstile-response". The shared site script
 * keeps building and sending the request; the token is reset after each attempt.
 */
(function () {
  'use strict';
  var SITEKEY = '0x4AAAAAAF7ZMxJ-u0_TBz6g';
  var ACTION = 'subscribe';
  var FORMS = '#subscribeModal form, form[data-subscribe-placement]';
  if (!SITEKEY || !window.fetch || !document.querySelector) return;

  var ready = false;
  var pendingForm = null;
  var nativeFetch = window.fetch;

  function slotFor(form) {
    var slot = form.querySelector('.cf-turnstile-slot');
    if (slot) return slot;
    slot = document.createElement('div');
    slot.className = 'cf-turnstile-slot';
    slot.style.margin = '12px 0';
    slot.style.minHeight = '65px';
    var submit = form.querySelector('[type="submit"]');
    form.insertBefore(slot, submit || null);
    return slot;
  }

  function isHidden(form) {
    var modal = form.closest && form.closest('#subscribeModal');
    return !!modal && !modal.classList.contains('open') && modal.getAttribute('aria-hidden') !== 'false';
  }

  function render(form) {
    if (!ready || !window.turnstile || form.dataset.turnstileWidgetId) return;
    try {
      var id = window.turnstile.render(slotFor(form), {
        sitekey: SITEKEY,
        action: ACTION,
        size: 'flexible',
        'refresh-expired': 'auto'
      });
      if (id !== undefined && id !== null) form.dataset.turnstileWidgetId = String(id);
    } catch (e) {}
  }

  function renderVisible() {
    Array.prototype.forEach.call(document.querySelectorAll(FORMS), function (form) {
      if (!isHidden(form)) render(form);
    });
  }

  function tokenFor(form) {
    var id = form && form.dataset.turnstileWidgetId;
    if (!id || !window.turnstile) return '';
    try { return window.turnstile.getResponse(id) || ''; } catch (e) { return ''; }
  }

  function reset(form) {
    var id = form && form.dataset.turnstileWidgetId;
    if (!id || !window.turnstile) return;
    try { window.turnstile.reset(id); } catch (e) {}
  }

  window.onFursayTurnstileLoad = function () {
    ready = true;
    renderVisible();
    var modal = document.getElementById('subscribeModal');
    if (modal && window.MutationObserver) {
      new MutationObserver(renderVisible).observe(modal, { attributes: true, attributeFilter: ['aria-hidden', 'class'] });
    }
  };

  // Capture phase: runs before the shared script's bubbling submit handler.
  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (form && form.matches && form.matches(FORMS)) {
      pendingForm = form;
      render(form);
    }
  }, true);

  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var form = pendingForm;
    if (form && init && typeof init.body === 'string' && /^(?:https?:\/\/[^/]+)?\/api\/subscribe(?:[?#]|$)/.test(url)) {
      pendingForm = null;
      try {
        var payload = JSON.parse(init.body);
        if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
          payload['cf-turnstile-response'] = tokenFor(form);
          init = Object.assign({}, init, { body: JSON.stringify(payload) });
        }
      } catch (e) {}
      var request = nativeFetch.call(window, input, init);
      request.then(function () { reset(form); }, function () { reset(form); });
      return request;
    }
    return nativeFetch.apply(window, arguments);
  };

  var script = document.createElement('script');
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onFursayTurnstileLoad';
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
})();
