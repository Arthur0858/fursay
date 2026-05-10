(function () {
  function qs(id) { return document.getElementById(id); }

  function syncChecks() {
    document.querySelectorAll('#subscribeModal .modal-check').forEach(function (check) {
      var input = check.querySelector('input');
      if (input) check.classList.toggle('checked', !!input.checked);
    });
  }

  function initNav() {
    var nav = qs('mainNav');
    if (nav) {
      var sync = function () { nav.classList.toggle('scrolled', window.scrollY > 10); };
      sync();
      window.addEventListener('scroll', sync, { passive: true });
    }

    document.querySelectorAll('.nav-burger').forEach(function (button) {
      button.addEventListener('click', function () {
        var links = qs('navLinks');
        if (!links) return;
        var navRight = button.closest('nav') ? button.closest('nav').querySelector('.nav-right') : null;
        links.classList.toggle('open');
        if (navRight) navRight.classList.toggle('open', links.classList.contains('open'));
        button.setAttribute('aria-expanded', links.classList.contains('open') ? 'true' : 'false');
      });
    });
  }

  function closeLangMenus(except) {
    document.querySelectorAll('[data-lang-menu].open').forEach(function (menu) {
      if (menu === except) return;
      menu.classList.remove('open');
      var toggle = menu.querySelector('.lang-toggle');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    });
  }

  function initLangMenus() {
    document.querySelectorAll('[data-lang-menu]').forEach(function (menu) {
      var toggle = menu.querySelector('.lang-toggle');
      if (!toggle) return;
      toggle.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        var nextOpen = !menu.classList.contains('open');
        closeLangMenus(menu);
        menu.classList.toggle('open', nextOpen);
        toggle.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
      });
    });

    document.addEventListener('click', function (event) {
      if (!event.target.closest('[data-lang-menu]')) closeLangMenus();
    });
  }

  function initActions() {
    document.addEventListener('click', function (event) {
      var tabButton = event.target.closest('.tab-btn[data-tab]');
      if (tabButton) {
        event.preventDefault();
        window.showTab(tabButton.getAttribute('data-tab'), tabButton);
        return;
      }

      var opener = event.target.closest('[data-open-subscribe]');
      if (opener) {
        event.preventDefault();
        window.openSubscribeModal(opener.getAttribute('data-open-subscribe') || undefined);
        return;
      }

      if (event.target.closest('[data-close-subscribe]')) {
        event.preventDefault();
        window.closeSubscribeModal();
      }
    });

    document.addEventListener('submit', function (event) {
      if (event.target && event.target.matches('#subscribeModal form')) {
        window.handleSubscribe(event);
      }
    });
  }

  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (event) {
        var target = document.querySelector(anchor.getAttribute('href'));
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function initReveal() {
    var items = document.querySelectorAll('.reveal');
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (item) { item.classList.add('visible'); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    items.forEach(function (item) { observer.observe(item); });
  }

  window.showTab = function (tab, btn) {
    document.querySelectorAll('.videos-grid').forEach(function (grid) {
      grid.style.display = 'none';
    });
    document.querySelectorAll('.tab-btn').forEach(function (button) {
      button.classList.remove('active');
    });

    var target = qs('tab-' + tab);
    if (target) target.style.display = 'grid';
    if (btn) btn.classList.add('active');

    var viewAllBtn = qs('view-all-btn');
    if (viewAllBtn) {
      viewAllBtn.href = tab === 'koko'
        ? 'https://www.youtube.com/@KokosForest'
        : 'https://www.youtube.com/@ArabicKidsChinese';
    }
  };

  window.openSubscribeModal = function (preselect) {
    var overlay = qs('subscribeModal');
    if (!overlay) return;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (preselect) {
      document.querySelectorAll('#subscribeModal input[name="groups"]').forEach(function (input) {
        if (input.value === preselect) input.checked = true;
      });
      document.querySelectorAll('#subscribeModal input[name="channel"]').forEach(function (input) {
        if (input.value === preselect || (preselect === 'noor' && input.value === 'arabic')) input.checked = true;
      });
    }
    syncChecks();
  };

  window.closeSubscribeModal = function () {
    var overlay = qs('subscribeModal');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
  };

  window.handleSubscribe = async function (event) {
    if (event) event.preventDefault();
    var emailEl = qs('modalEmail') || qs('sub-email');
    var nameEl = qs('sub-name');
    var msg = qs('sub-msg') || document.querySelector('#subscribeModal .modal-note');
    var btn = qs('modalSubmitBtn') || (event && event.target ? event.target.querySelector('[type="submit"]') : null);
    var email = emailEl ? emailEl.value.trim() : '';

    if (!email) {
      if (msg) {
        msg.style.display = 'block';
        msg.textContent = 'Please enter an email address.';
      }
      return;
    }

    var groups = Array.from(document.querySelectorAll('#subscribeModal input[name="groups"]:checked, #subscribeModal input[name="channel"]:checked')).map(function (input) {
      if (input.value === 'arabic') return 'noor';
      return input.value;
    });
    groups = Array.from(new Set(groups));
    var payload = {
      email: email,
      name: nameEl ? nameEl.value.trim() : undefined,
      groups: groups,
      child_age: qs('modalAge') ? qs('modalAge').value : (qs('sub-age') ? qs('sub-age').value : ''),
      region: qs('modalRegion') ? qs('modalRegion').value : (qs('sub-region') ? qs('sub-region').value : '')
    };

    if (btn) {
      btn.disabled = true;
      btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
      btn.textContent = 'Sending...';
    }
    if (msg) {
      msg.style.display = 'block';
      msg.textContent = 'Sending...';
    }

    try {
      var res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      var data = {};
      try { data = await res.json(); } catch (e) {}
      var ok = res.ok && data.success !== false;
      if (msg) msg.textContent = ok ? 'Subscribed successfully.' : (data.message || 'Please try again.');
      if (btn) btn.textContent = ok ? 'Subscribed!' : (btn.dataset.originalText || 'Subscribe');
      if (ok && event && event.target && typeof event.target.reset === 'function') event.target.reset();
      syncChecks();
    } catch (e) {
      if (msg) msg.textContent = 'Could not connect. Please try again later.';
      if (btn) btn.textContent = btn.dataset.originalText || 'Subscribe';
    } finally {
      if (btn) setTimeout(function () { btn.disabled = false; }, 500);
    }
  };

  document.addEventListener('click', function (event) {
    if (event.target && event.target.classList.contains('modal-overlay')) window.closeSubscribeModal();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      window.closeSubscribeModal();
      closeLangMenus();
    }
  });

  document.addEventListener('change', function (event) {
    if (event.target && event.target.matches('#subscribeModal .modal-check input')) syncChecks();
  });

  initNav();
  initLangMenus();
  initActions();
  initSmoothScroll();
  initReveal();
  syncChecks();
})();
