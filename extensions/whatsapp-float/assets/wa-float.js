(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function render(cfg) {
    try {
      var num = String(cfg.number || '').replace(/\D/g, '');
      if (!/^\d{6,15}$/.test(num)) return;

      var msg = cfg.message || '';
      var position = cfg.position === 'left' ? 'left' : 'right';
      var offsetX = parseInt(cfg.offset_x || 24, 10);
      var offsetY = parseInt(cfg.offset_y || 24, 10);
      var size = parseInt(cfg.size || 56, 10);
      var bg = cfg.bg_color || '#25D366';
      var icon = cfg.icon_color || '#fff';
      var showMobile = cfg.show_on_mobile !== false;
      var showDesktop = cfg.show_on_desktop !== false;

      var isMobileViewport = window.matchMedia('(max-width: 749px)').matches;
      if ((isMobileViewport && !showMobile) || (!isMobileViewport && !showDesktop)) return;

      var isMobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      var httpsLink = 'https://wa.me/' + num + (msg ? ('?text=' + encodeURIComponent(msg)) : '');
      var deepLink = 'whatsapp://send?phone=' + num + (msg ? ('&text=' + encodeURIComponent(msg)) : '');
      var href = isMobileUA ? deepLink : httpsLink;

      if (cfg.show_everywhere === false) {
        var pageType =
          (window.Shopify && window.Shopify.analytics && window.Shopify.analytics.meta && window.Shopify.analytics.meta.pageType) ||
          (window.__st && window.__st.p) ||
          '';
        var allowed = false;
        if (pageType === 'index' && cfg.show_on_home) allowed = true;
        if (pageType === 'product' && cfg.show_on_product) allowed = true;
        if (pageType === 'collection' && cfg.show_on_collection) allowed = true;
        if (pageType === 'article' && cfg.show_on_article) allowed = true;
        if (pageType === 'cart' && cfg.show_on_cart) allowed = true;
        if (!allowed) return;
      }

      var a = document.createElement('a');
      a.href = href;
      a.id = 'wa-floating-btn';
      a.setAttribute('aria-label', 'Chat on WhatsApp');
      if (cfg.open_in_new !== false) {
        a.target = '_blank';
        a.rel = 'noopener';
      }

      if (isMobileUA) {
        a.addEventListener('click', function () {
          var t = setTimeout(function () { window.location.href = httpsLink; }, 1200);
          var clear = function () { clearTimeout(t); document.removeEventListener('visibilitychange', clear); };
          document.addEventListener('visibilitychange', clear, { once: true });
        });
      }

      a.style.cssText = [
        'position:fixed', 'z-index:9999',
        'width:' + size + 'px', 'height:' + size + 'px',
        'border-radius:9999px', 'display:grid', 'place-items:center',
        'box-shadow:0 6px 18px rgba(0,0,0,.2)',
        'background:' + bg, 'bottom:' + offsetY + 'px',
        (position === 'left' ? 'left' : 'right') + ':' + offsetX + 'px'
      ].join(';');

      var svgNS = 'http://www.w3.org/2000/svg';
      var svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('viewBox', '0 0 32 32');
      svg.setAttribute('width', Math.floor(size * 0.55));
      svg.setAttribute('height', Math.floor(size * 0.55));
      svg.setAttribute('aria-hidden', 'true');
      var path = document.createElementNS(svgNS, 'path');
      path.setAttribute('fill', icon);
      path.setAttribute('d', 'M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z');
      //path.setAttribute('d', 'M19.1 17.3c-.3-.2-.6-.3-.8 0-.2.2-.9 1.1-1.1 1.3-.2.2-.4.2-.7.1-2.1-.8-3.6-2.2-4.7-4.1-.2-.2-.2-.5.1-.7.1-.1 1.1-.9 1.2-1.2.1-.3 0-.5 0-.7 0-.2-.7-1.7-.9-2.2-.2-.5-.5-.4-.7-.4h-.6c-.2 0-.5.1-.7.3-.8.8-1.1 1.9-1 3 .1 1 .6 1.9 1.1 2.8 1.3 2.2 3.1 3.9 5.4 5 .6.3 1.3.5 2 .6.8.1 1.5 0 2.2-.4.5-.3 1.2-.8 1.4-1.5.2-.7.2-1.4.1-2.1-.1-.2-.3-.3-.5-.4zM26 16c0 5.5-4.5 10-10 10-1.8 0-3.6-.5-5.1-1.3L6 26l1.3-4.8C6.5 19.7 6 17.9 6 16 6 10.5 10.5 6 16 6s10 4.5 10 10z');
      svg.appendChild(path);
      a.appendChild(svg);

      a.addEventListener('mouseenter', function () { a.style.filter = 'brightness(0.95)'; });
      a.addEventListener('mouseleave', function () { a.style.filter = 'none'; });

      document.body.appendChild(a);
    } catch (e) {
      console.error('[WhatsApp Float]', e);
    }
  }

  function fetchConfig(shop) {
    var endpoint = 'https://cclab-f12o.onrender.com/public/wa-float-config?shop=' + encodeURIComponent(shop);
    fetch(endpoint, { credentials: 'omit' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (cfg) {
        if (!cfg || typeof cfg !== 'object') return;
        ready(function () { render(cfg); });
      })
      .catch(function () { /* silent */ });
  }

  var shopDomain = window.__WA_FLOAT_SHOP__ ||
    (window.Shopify && window.Shopify.shop) ||
    (window.__st && window.__st.domain) ||
    new URLSearchParams(window.location.search).get('shop');

  if (shopDomain) {
    fetchConfig(shopDomain);
  }
})();
