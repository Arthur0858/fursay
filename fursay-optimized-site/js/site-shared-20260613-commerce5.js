(function () {
  function qs(id) { return document.getElementById(id); }

  function eventContext(extra) {
    var context = {
      path: window.location.pathname || '/',
      locale: document.documentElement.lang || '',
      page_pack: pagePack() || '',
      campaign: pageCampaign()
    };
    Object.keys(extra || {}).forEach(function (key) {
      var value = extra[key];
      if (value !== undefined && value !== null && value !== '') context[key] = value;
    });
    return context;
  }

  function emitFursayEvent(name, detail) {
    var event = {
      event: name,
      detail: eventContext(detail),
      ts: new Date().toISOString()
    };
    window.fursayEvents = window.fursayEvents || [];
    window.fursayEvents.push(event);
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: name,
      fursay: event.detail
    });
    sendAnonymousEvent(event);
    return event;
  }

  function sendAnonymousEvent(event) {
    try {
      var payload = JSON.stringify({
        event: event.event,
        detail: event.detail,
        ts: event.ts
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/event', new Blob([payload], { type: 'application/json' }));
        return;
      }
      fetch('/api/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }

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
        emitFursayEvent('fursay_subscribe_open_click', {
          pack: normalizePack(opener.getAttribute('data-open-subscribe')),
          signup_source: opener.getAttribute('data-signup-source') || ''
        });
        window.openSubscribeModal(
          opener.getAttribute('data-open-subscribe') || undefined,
          opener.getAttribute('data-signup-source') || undefined
        );
        return;
      }

      if (event.target.closest('[data-close-subscribe]')) {
        event.preventDefault();
        window.closeSubscribeModal();
        return;
      }

      var affiliateLink = event.target.closest('a.book-link[href*="amazon.com/dp/"], a.book-link[href*="books.com.tw/exep/assp.php/"]');
      if (affiliateLink) {
        emitFursayEvent('fursay_affiliate_click', affiliateEventDetail(affiliateLink));
      }

      var outboundLink = event.target.closest('a[data-fursay-outbound]');
      if (outboundLink) {
        emitFursayEvent('fursay_outbound_click', outboundEventDetail(outboundLink));
      }

      var shareButton = event.target.closest('[data-share-fursay]');
      if (shareButton) {
        event.preventDefault();
        emitFursayEvent('fursay_share_click', {
          share_url: shareButton.getAttribute('data-share-url') || ''
        });
        window.shareFursay(shareButton);
        return;
      }

      var packLinkButton = event.target.closest('[data-copy-pack-link]');
      if (packLinkButton) {
        event.preventDefault();
        emitFursayEvent('fursay_pack_link_copy_click', {
          pack: normalizePack(packLinkButton.getAttribute('data-sample-pack') || pagePack()),
          link_url: packLinkButton.getAttribute('data-pack-url') || ''
        });
        copyPackLink(packLinkButton);
        return;
      }

      var sampleLinkButton = event.target.closest('[data-copy-sample-link]');
      if (sampleLinkButton) {
        event.preventDefault();
        emitFursayEvent('fursay_sample_link_copy_click', {
          pack: normalizePack(sampleLinkButton.getAttribute('data-sample-pack') || pagePack()),
          link_url: sampleLinkButton.getAttribute('data-sample-url') || ''
        });
        copySampleLink(sampleLinkButton);
        return;
      }

      var publicShareButton = event.target.closest('[data-copy-public-share-link]');
      if (publicShareButton) {
        event.preventDefault();
        emitFursayEvent('fursay_public_share_copy_click', {
          link_url: publicShareButton.getAttribute('data-public-share-url') || ''
        });
        copyPublicShareLink(publicShareButton);
        return;
      }

      var productInfoLink = event.target.closest('a[data-product-info-link]');
      if (productInfoLink) {
        emitFursayEvent('fursay_product_info_click', {
          product_interest: normalizePack(productInfoLink.getAttribute('data-product-info-link')) || productInfoLink.getAttribute('data-product-info-link') || 'all',
          interest_stage: productInfoLink.getAttribute('data-interest-stage') || 'info_page',
          signup_source: productInfoLink.getAttribute('data-signup-source') || 'product_info_link',
          link_url: productInfoLink.getAttribute('href') || ''
        });
      }

      var productSamplePrintButton = event.target.closest('[data-print-product-sample]');
      if (productSamplePrintButton) {
        event.preventDefault();
        var samplePack = normalizePack(productSamplePrintButton.getAttribute('data-print-product-sample')) || pagePack() || 'all';
        emitFursayEvent('fursay_product_info_click', {
          product_interest: samplePack,
          interest_stage: productSamplePrintButton.getAttribute('data-interest-stage') || 'sample_print',
          signup_source: productSamplePrintButton.getAttribute('data-signup-source') || 'sample_print_' + samplePack,
          link_url: window.location.pathname || ''
        });
        window.print();
        return;
      }

      var productInterestButton = event.target.closest('[data-product-interest]');
      if (productInterestButton) {
        event.preventDefault();
        var interest = normalizePack(productInterestButton.getAttribute('data-product-interest')) || pagePack() || 'koko';
        emitFursayEvent('fursay_product_interest_click', {
          product_interest: interest,
          interest_stage: productInterestButton.getAttribute('data-interest-stage') || 'waitlist',
          signup_source: productInterestButton.getAttribute('data-signup-source') || 'product_interest_' + interest
        });
        window.openSubscribeModal(
          interest,
          productInterestButton.getAttribute('data-signup-source') || 'product_interest_' + interest
        );
        return;
      }

      var kitCopyButton = event.target.closest('[data-copy-creator-kit], [data-copy-share-kit], [data-copy-traffic-launch]');
      if (kitCopyButton) {
        event.preventDefault();
        emitFursayEvent('fursay_kit_copy_click', {
          copy_kind: kitCopyButton.hasAttribute('data-copy-traffic-launch') ? 'traffic_launch' : (kitCopyButton.hasAttribute('data-copy-share-kit') ? 'share_kit' : 'creator_kit')
        });
        copyKitValue(kitCopyButton);
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

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80) || 'link';
  }

  function pageCampaign() {
    var path = window.location.pathname || '/';
    if (path.includes('arabic') || path.includes('noor')) return 'noor_story_funnel';
    if (path.includes('koko')) return 'koko_story_funnel';
    return 'home_story_funnel';
  }

  function pagePack() {
    var path = window.location.pathname || '/';
    if (path.includes('arabic') || path.includes('noor')) return 'noor';
    if (path.includes('koko')) return 'koko';
    return '';
  }

  function linkContent(anchor, url) {
    var source = anchor.getAttribute('data-signup-source');
    if (source) return source;
    if (url.pathname.includes('/videos')) return 'videos_library';
    if (url.pathname.includes('/playlists')) return 'playlists_library';
    if (url.pathname.includes('@ArabicKidsChinese')) return 'noor_channel';
    if (url.pathname.includes('@KokosForest')) return 'koko_channel';
    return slugify(anchor.textContent);
  }

  function affiliateEventDetail(anchor) {
    var detail = {
      market: '',
      product_id: '',
      outbound_host: '',
      link_text: slugify(anchor.textContent)
    };
    try {
      var url = new URL(anchor.href);
      detail.outbound_host = url.hostname.replace(/^www\./, '');
      if (detail.outbound_host === 'amazon.com') {
        detail.market = 'amazon';
        detail.product_id = (url.pathname.match(/\/dp\/([^/?#]+)/) || [])[1] || '';
      } else if (detail.outbound_host === 'books.com.tw') {
        detail.market = 'books';
        detail.product_id = (url.pathname.match(/\/products\/([^/?#]+)/) || [])[1] || '';
      }
    } catch (e) {}
    return detail;
  }

  function outboundEventDetail(anchor) {
    var detail = {
      outbound_kind: anchor.getAttribute('data-fursay-outbound') || '',
      outbound_host: '',
      outbound_path: '',
      link_content: ''
    };
    try {
      var url = new URL(anchor.href);
      detail.outbound_host = url.hostname.replace(/^www\./, '');
      detail.outbound_path = url.pathname;
      detail.link_content = url.searchParams.get('utm_content') || linkContent(anchor, url);
    } catch (e) {}
    return detail;
  }

  function initOutboundAttribution() {
    document.querySelectorAll('a[href*="youtube.com/"], a[href*="youtu.be/"]').forEach(function (anchor) {
      try {
        var url = new URL(anchor.href);
        if (!/youtube\.com$|youtu\.be$/.test(url.hostname.replace(/^www\./, ''))) return;
        url.searchParams.set('utm_source', 'fursay');
        url.searchParams.set('utm_medium', 'site');
        url.searchParams.set('utm_campaign', pageCampaign());
        url.searchParams.set('utm_content', linkContent(anchor, url));
        if (/^\/@(?:KokosForest|ArabicKidsChinese)\/?$/.test(url.pathname)) {
          url.searchParams.set('sub_confirmation', '1');
        }
        anchor.href = url.toString();
        anchor.dataset.fursayOutbound = 'youtube';
      } catch (e) {}
    });
  }

  function localeText() {
    var lang = document.documentElement.lang || 'en';
    if (lang === 'zh-TW') {
      return {
        kicker: '分享給另一個家庭',
        title: '把這個故事入口傳給需要的家長。',
        body: '一個短故事、一句話、一個小活動。適合想輕鬆開始雙語陪讀的家庭。',
        share: '分享連結',
        copied: '已複製',
        fallback: '複製連結',
        subscribe: '取得故事包',
        subscribeKoko: '叩叩英文包',
        subscribeNoor: '努爾中文包',
        packLink: '複製故事包連結',
        packLinkKoko: '複製叩叩連結',
        packLinkNoor: '複製努爾連結',
        packLinkCopied: '故事包連結已複製',
        sampleLink: '複製樣張短連結',
        sampleLinkKoko: '複製叩叩樣張',
        sampleLinkNoor: '複製努爾樣張',
        sampleLinkCopied: '樣張短連結已複製',
        publicShareCopied: '分享連結已複製'
      };
    }
    if (lang === 'ar') {
      return {
        kicker: 'شاركوها مع عائلة أخرى',
        title: 'أرسلوا مدخل القصة هذا إلى والدين يحتاجونه.',
        body: 'قصة قصيرة، عبارة واحدة، ونشاط صغير لعائلة تريد بداية ثنائية اللغة بهدوء.',
        share: 'مشاركة الرابط',
        copied: 'تم النسخ',
        fallback: 'نسخ الرابط',
        subscribe: 'احصلوا على الحزمة',
        subscribeKoko: 'حزمة كوكو الإنجليزية',
        subscribeNoor: 'حزمة نور الصينية',
        packLink: 'نسخ رابط الحزمة',
        packLinkKoko: 'نسخ رابط كوكو',
        packLinkNoor: 'نسخ رابط نور',
        packLinkCopied: 'تم نسخ رابط الحزمة',
        sampleLink: 'نسخ رابط النموذج',
        sampleLinkKoko: 'نسخ نموذج كوكو',
        sampleLinkNoor: 'نسخ نموذج نور',
        sampleLinkCopied: 'تم نسخ رابط النموذج',
        publicShareCopied: 'تم نسخ رابط المشاركة'
      };
    }
    return {
      kicker: 'Share with another family',
      title: 'Send this story path to a parent who could use it.',
      body: 'One short story, one phrase, and one small activity for families starting bilingual story time.',
      share: 'Share link',
      copied: 'Copied',
      fallback: 'Copy link',
      subscribe: 'Get the pack',
      subscribeKoko: 'Koko English pack',
      subscribeNoor: 'Noor Chinese pack',
      packLink: 'Copy pack link',
      packLinkKoko: 'Copy Koko link',
      packLinkNoor: 'Copy Noor link',
      packLinkCopied: 'Pack link copied',
      sampleLink: 'Copy sample link',
      sampleLinkKoko: 'Copy Koko sample',
      sampleLinkNoor: 'Copy Noor sample',
      sampleLinkCopied: 'Sample link copied',
      publicShareCopied: 'Share link copied'
    };
  }

  function subscribeActionHtml(text, pack, label, source) {
    return '<button type="button" class="share-subscribe" data-open-subscribe="' + pack + '" data-signup-source="' + source + '">' + label + '</button>';
  }

  function shareUrl() {
    var canonical = document.querySelector('link[rel="canonical"]');
    var url = new URL(canonical && canonical.href ? canonical.href : window.location.href);
    url.searchParams.set('utm_source', 'family_share');
    url.searchParams.set('utm_medium', 'share');
    url.searchParams.set('utm_campaign', pageCampaign());
    url.searchParams.set('utm_content', 'share_strip');
    return url.toString();
  }

  function packUrl(pack) {
    var canonical = document.querySelector('link[rel="canonical"]');
    var url = new URL(canonical && canonical.href ? canonical.href : window.location.href);
    url.searchParams.set('subscribe', pack);
    url.searchParams.set('utm_source', 'family_share');
    url.searchParams.set('utm_medium', 'share');
    url.searchParams.set('utm_campaign', pageCampaign());
    url.searchParams.set('utm_content', pack + '_pack_link');
    return url.toString();
  }

  function sampleUrl(pack) {
    var url = new URL('/share/' + pack, window.location.origin);
    return url.toString();
  }

  function normalizePack(value) {
    value = String(value || '').toLowerCase();
    if (value === 'arabic') return 'noor';
    if (value === 'koko' || value === 'noor') return value;
    return '';
  }

  function initShareStrip() {
    if (document.querySelector('.share-strip')) return;
    var footer = document.querySelector('footer');
    if (!footer) return;
    var text = localeText();
    var url = shareUrl();
    var escapedUrl = url.replace(/"/g, '&quot;');
    var pack = pagePack();
    var packLink = pack ? packUrl(pack) : '';
    var escapedPackLink = packLink.replace(/"/g, '&quot;');
    var sampleLink = pack ? sampleUrl(pack) : '';
    var escapedSampleLink = sampleLink.replace(/"/g, '&quot;');
    var subscribeAction = pack
      ? subscribeActionHtml(text, pack, text.subscribe, 'share_strip_' + pack + '_pack')
      : [
        subscribeActionHtml(text, 'koko', text.subscribeKoko, 'share_strip_home_koko_pack'),
        subscribeActionHtml(text, 'noor', text.subscribeNoor, 'share_strip_home_noor_pack')
      ].join('');
    var packLinkAction = pack
      ? '<button type="button" class="share-pack-link" data-copy-pack-link data-pack-url="' + escapedPackLink + '">' + text.packLink + '</button>'
      : [
        '<button type="button" class="share-pack-link" data-copy-pack-link data-pack-url="' + packUrl('koko').replace(/"/g, '&quot;') + '">' + text.packLinkKoko + '</button>',
        '<button type="button" class="share-pack-link" data-copy-pack-link data-pack-url="' + packUrl('noor').replace(/"/g, '&quot;') + '">' + text.packLinkNoor + '</button>'
      ].join('');
    var sampleLinkAction = pack
      ? '<button type="button" class="share-pack-link" data-copy-sample-link data-sample-pack="' + pack + '" data-sample-url="' + escapedSampleLink + '">' + text.sampleLink + '</button>'
      : [
        '<button type="button" class="share-pack-link" data-copy-sample-link data-sample-pack="koko" data-sample-url="' + sampleUrl('koko').replace(/"/g, '&quot;') + '">' + text.sampleLinkKoko + '</button>',
        '<button type="button" class="share-pack-link" data-copy-sample-link data-sample-pack="noor" data-sample-url="' + sampleUrl('noor').replace(/"/g, '&quot;') + '">' + text.sampleLinkNoor + '</button>'
      ].join('');
    var section = document.createElement('section');
    section.className = 'share-strip';
    section.setAttribute('aria-label', text.kicker);
    section.innerHTML = [
      '<div class="share-strip-inner">',
      '<div class="share-copy">',
      '<span class="share-kicker">' + text.kicker + '</span>',
      '<h2>' + text.title + '</h2>',
      '<p>' + text.body + '</p>',
      '</div>',
      '<div class="share-actions">',
      '<button type="button" class="btn btn-secondary" data-share-fursay data-share-url="' + escapedUrl + '">' + text.share + '</button>',
      subscribeAction,
      packLinkAction,
      sampleLinkAction,
      '<a class="share-fallback" href="' + escapedUrl + '">' + text.fallback + '</a>',
      '<span class="share-status" aria-live="polite"></span>',
      '</div>',
      '</div>'
    ].join('');
    footer.parentNode.insertBefore(section, footer);
  }

  async function shareFursay(button) {
    var text = localeText();
    var url = button.getAttribute('data-share-url') || shareUrl();
    var status = button.closest('.share-strip')?.querySelector('.share-status');
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url: url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        window.prompt(text.fallback, url);
      }
      if (status) status.textContent = text.copied;
    } catch (e) {
      if (status) status.textContent = '';
    }
  }

  async function copyPackLink(button) {
    var text = localeText();
    var url = button.getAttribute('data-pack-url') || packUrl(pagePack() || 'koko');
    var status = button.closest('.share-strip')?.querySelector('.share-status');
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        window.prompt(text.packLink, url);
      }
      if (status) status.textContent = text.packLinkCopied;
    } catch (e) {
      if (status) status.textContent = '';
    }
  }

  async function copySampleLink(button) {
    var text = localeText();
    var pack = normalizePack(button.getAttribute('data-sample-pack')) || pagePack() || 'koko';
    var url = button.getAttribute('data-sample-url') || sampleUrl(pack);
    var status = button.closest('.share-strip')?.querySelector('.share-status');
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        window.prompt(text.sampleLink, url);
      }
      if (status) status.textContent = text.sampleLinkCopied;
    } catch (e) {
      if (status) status.textContent = '';
    }
  }

  async function copyPublicShareLink(button) {
    var text = localeText();
    var url = button.getAttribute('data-copy-public-share-link') || '';
    var panel = button.closest('[data-public-share]');
    var status = panel ? panel.querySelector('[data-public-share-status]') : null;
    try {
      var absoluteUrl = new URL(url, window.location.origin).toString();
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(absoluteUrl);
      } else {
        window.prompt(button.textContent.trim() || text.fallback, absoluteUrl);
      }
      if (status) status.textContent = text.publicShareCopied;
    } catch (e) {
      if (status) status.textContent = '';
    }
  }

  async function copyKitValue(button) {
    var value = button.getAttribute('data-copy-value') || '';
    var copyLabel = button.dataset.copyLabel || button.dataset.originalText || button.textContent || 'Copy';
    var copiedLabel = button.getAttribute('data-copied-label') || 'Copied';
    var failedLabel = button.getAttribute('data-copy-failed-label') || 'Copy failed';
    button.dataset.originalText = copyLabel;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        window.prompt(copyLabel, value);
      }
      button.textContent = copiedLabel;
      setTimeout(function () { button.textContent = copyLabel; }, 1600);
    } catch (e) {
      button.textContent = failedLabel;
      setTimeout(function () { button.textContent = copyLabel; }, 1800);
    }
  }

  window.showTab = function (tab, btn) {
    document.querySelectorAll('.videos-grid').forEach(function (grid) {
      grid.classList.add('is-hidden');
      grid.style.display = 'none';
    });
    document.querySelectorAll('.tab-btn').forEach(function (button) {
      button.classList.remove('active');
    });

    var target = qs('tab-' + tab);
    if (target) {
      target.classList.remove('is-hidden');
      target.style.display = 'grid';
    }
    if (btn) btn.classList.add('active');

    var viewAllBtn = qs('view-all-btn');
    if (viewAllBtn) {
      viewAllBtn.href = tab === 'koko'
        ? 'https://www.youtube.com/@KokosForest'
        : 'https://www.youtube.com/@ArabicKidsChinese';
      initOutboundAttribution();
    }
  };

  function collectSubscribeAttribution() {
    var params = new URLSearchParams(window.location.search || '');
    var overlay = qs('subscribeModal');
    var subscribeIntent = normalizePack(params.get('subscribe') || params.get('pack') || params.get('group'));
    var attribution = {
      signup_source: overlay && overlay.dataset.signupSource ? overlay.dataset.signupSource : 'site_subscribe_modal',
      landing_path: window.location.pathname || '/',
      landing_locale: document.documentElement.lang || '',
      referrer_host: ''
    };
    if (subscribeIntent) attribution.subscribe_intent = subscribeIntent;
    attribution.entry_pack = subscribeIntent || pagePack() || '';
    if (overlay && overlay.dataset.preselect) attribution.modal_preselect = overlay.dataset.preselect;

    if (document.referrer) {
      try { attribution.referrer_host = new URL(document.referrer).host; } catch (e) {}
    }

    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref', 'source_id', 'creator', 'placement'].forEach(function (key) {
      var value = params.get(key);
      if (value) attribution[key] = value;
    });

    return attribution;
  }

  window.openSubscribeModal = function (preselect, signupSource) {
    var overlay = qs('subscribeModal');
    if (!overlay) return;
    overlay.dataset.signupSource = signupSource || (preselect ? preselect + '_subscribe_cta' : 'site_subscribe_modal');
    overlay.dataset.preselect = preselect || '';
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    emitFursayEvent('fursay_subscribe_modal_open', {
      pack: normalizePack(preselect),
      signup_source: overlay.dataset.signupSource
    });
    if (preselect) {
      document.querySelectorAll('#subscribeModal input[name="groups"]').forEach(function (input) {
        input.checked = input.value === preselect;
      });
      document.querySelectorAll('#subscribeModal input[name="channel"]').forEach(function (input) {
        input.checked = input.value === preselect || (preselect === 'noor' && input.value === 'arabic');
      });
    }
    syncChecks();
  };

  function initSubscribeDeepLink() {
    var params = new URLSearchParams(window.location.search || '');
    var requested = params.get('subscribe') || params.get('pack') || params.get('group');
    if (!requested) return;
    requested = requested.toLowerCase();
    if (requested === 'arabic') requested = 'noor';
    if (requested !== 'koko' && requested !== 'noor') return;
    window.setTimeout(function () {
      window.openSubscribeModal(requested, 'url_subscribe_' + requested);
    }, 120);
  }

  window.closeSubscribeModal = function () {
    var overlay = qs('subscribeModal');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
  };

  window.shareFursay = shareFursay;
  window.emitFursayEvent = emitFursayEvent;

  window.handleSubscribe = async function (event) {
    if (event) event.preventDefault();
    var emailEl = qs('modalEmail') || qs('sub-email');
    var nameEl = qs('sub-name');
    var msg = qs('sub-msg') || document.querySelector('#subscribeModal .modal-note');
    var btn = qs('modalSubmitBtn') || (event && event.target ? event.target.querySelector('[type="submit"]') : null);
    var email = emailEl ? emailEl.value.trim() : '';

    if (!email) {
      if (msg) {
        msg.classList.remove('is-hidden');
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
      region: qs('modalRegion') ? qs('modalRegion').value : (qs('sub-region') ? qs('sub-region').value : ''),
      attribution: collectSubscribeAttribution()
    };
    emitFursayEvent('fursay_subscribe_submit_attempt', {
      groups: groups.join(','),
      signup_source: payload.attribution.signup_source || '',
      modal_preselect: payload.attribution.modal_preselect || ''
    });

    if (btn) {
      btn.disabled = true;
      btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
      btn.textContent = 'Sending...';
    }
    if (msg) {
      msg.classList.remove('is-hidden');
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
      emitFursayEvent(ok ? 'fursay_subscribe_submit_success' : 'fursay_subscribe_submit_failure', {
        groups: groups.join(','),
        signup_source: payload.attribution.signup_source || '',
        status: res.status
      });
      if (msg) msg.textContent = ok ? 'Subscribed successfully.' : (data.message || 'Please try again.');
      if (btn) btn.textContent = ok ? 'Subscribed!' : (btn.dataset.originalText || 'Subscribe');
      if (ok && event && event.target && typeof event.target.reset === 'function') event.target.reset();
      syncChecks();
    } catch (e) {
      emitFursayEvent('fursay_subscribe_submit_error', {
        groups: groups.join(','),
        signup_source: payload.attribution.signup_source || ''
      });
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
  initShareStrip();
  initActions();
  initSmoothScroll();
  initReveal();
  initOutboundAttribution();
  initSubscribeDeepLink();
  syncChecks();
})();
