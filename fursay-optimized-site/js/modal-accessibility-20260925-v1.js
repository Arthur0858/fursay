(function () {
  document.addEventListener('click', function (event) {
    var skipLink = event.target.closest && event.target.closest('a.skip-link');
    if (!skipLink) return;
    var targetId = skipLink.getAttribute('href').slice(1);
    var target = document.getElementById(targetId);
    if (!target) return;
    window.setTimeout(function () {
      target.focus({ preventScroll: true });
    }, 0);
  });

  var overlay = document.getElementById('subscribeModal');
  if (!overlay) return;

  var wasOpen = false;
  var returnFocus = null;
  var inertedElements = [];
  var focusableSelector = [
    'a[href]',
    'area[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'iframe',
    'object',
    'embed',
    '[contenteditable="true"]',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  function visibleFocusables() {
    return Array.prototype.slice.call(overlay.querySelectorAll(focusableSelector)).filter(function (element) {
      return !element.hasAttribute('disabled') && element.getClientRects().length > 0;
    });
  }

  function makeBackgroundInert() {
    inertedElements = [];
    Array.prototype.forEach.call(document.body.children, function (element) {
      if (element === overlay || element.tagName === 'SCRIPT' || element.tagName === 'STYLE') return;
      if (!element.hasAttribute('inert')) {
        element.setAttribute('inert', '');
        inertedElements.push(element);
      }
    });
  }

  function restoreBackground() {
    inertedElements.forEach(function (element) {
      element.removeAttribute('inert');
    });
    inertedElements = [];
  }

  function activateDialog() {
    if (wasOpen) return;
    wasOpen = true;
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    overlay.setAttribute('aria-hidden', 'false');

    var target = overlay.querySelector('input[type="email"]') || visibleFocusables()[0] || overlay;
    target.focus({ preventScroll: true });
    makeBackgroundInert();
  }

  function deactivateDialog() {
    if (!wasOpen) return;
    wasOpen = false;
    overlay.setAttribute('aria-hidden', 'true');
    restoreBackground();

    var target = returnFocus;
    returnFocus = null;
    requestAnimationFrame(function () {
      if (target && target.isConnected && !target.hasAttribute('disabled')) {
        target.focus({ preventScroll: true });
      }
    });
  }

  document.addEventListener('keydown', function (event) {
    if (!wasOpen || event.key !== 'Tab') return;
    var focusables = visibleFocusables();
    if (!focusables.length) {
      event.preventDefault();
      overlay.focus({ preventScroll: true });
      return;
    }

    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (event.shiftKey && (document.activeElement === first || !overlay.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !overlay.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  });

  new MutationObserver(function () {
    if (overlay.classList.contains('open')) activateDialog();
    else deactivateDialog();
  }).observe(overlay, { attributes: true, attributeFilter: ['class'] });

  if (overlay.classList.contains('open')) activateDialog();
})();
