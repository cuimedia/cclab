// Self-contained JS bundle that inlines per-shop config
import type { LoaderFunctionArgs } from "@remix-run/node";
import prisma from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  const headers = new Headers({
    "Content-Type": "application/javascript; charset=utf-8",
    // Allow CDN/proxy caching if desired; adjust as needed
    "Cache-Control": "public, max-age=300",
  });

  if (!shop) {
    return new Response("/* missing shop */", { status: 400, headers });
  }

  const row = await prisma.waFloatConfig.findUnique({ where: { shop } });
  const cfg = (row?.config as any) || null;

  // Gracefully no-op when there is no config
  if (!cfg || !cfg.number) {
    return new Response("/* wa-float disabled or incomplete */", { headers });
  }

  const js = `(() => {
    'use strict';
    var cfg = ${JSON.stringify(cfg)};

    try {
      var num = String(cfg.number || '').replace(/\\D/g, '');
      if (!/^\\d{6,15}$/.test(num)) return;

      var msg = cfg.message || '';
      var position = cfg.position === 'left' ? 'left' : 'right';
      var offsetX = parseInt(cfg.offset_x == null ? 24 : cfg.offset_x, 10);
      var offsetY = parseInt(cfg.offset_y == null ? 24 : cfg.offset_y, 10);
      var size = parseInt(cfg.size == null ? 56 : cfg.size, 10);
      var bg = cfg.bg_color || '#25D366';
      var icon = cfg.icon_color || '#fff';
      var showMobile = cfg.show_on_mobile !== false;
      var showDesktop = cfg.show_on_desktop !== false;
      var isMobileViewport = window.matchMedia('(max-width: 749px)').matches;
      if ((isMobileViewport && !showMobile) || (!isMobileViewport && !showDesktop)) return;

      var showEverywhere = cfg.show_everywhere !== false;
      if (!showEverywhere) {
        var pageType = (window.Shopify && window.Shopify.analytics && window.Shopify.analytics.meta && window.Shopify.analytics.meta.pageType) ||
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

      var isMobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      var httpsLink = 'https://wa.me/' + num + (msg ? ('?text=' + encodeURIComponent(msg)) : '');
      var deepLink = 'whatsapp://send?phone=' + num + (msg ? ('&text=' + encodeURIComponent(msg)) : '');
      var href = isMobileUA ? deepLink : httpsLink;

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
      var glyphSize = Math.floor(size * 0.55);
      svg.setAttribute('width', glyphSize);
      svg.setAttribute('height', glyphSize);
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      var path = document.createElementNS(svgNS, 'path');
      path.setAttribute('fill', icon);
      path.setAttribute('d', 'M19.1 17.3c-.3-.2-.6-.3-.8 0-.2.2-.9 1.1-1.1 1.3-.2.2-.4.2-.7.1-2.1-.8-3.6-2.2-4.7-4.1-.2-.2-.2-.5.1-.7.1-.1 1.1-.9 1.2-1.2.1-.3 0-.5 0-.7 0-.2-.7-1.7-.9-2.2-.2-.5-.5-.4-.7-.4h-.6c-.2 0-.5.1-.7.3-.8.8-1.1 1.9-1 3 .1 1 .6 1.9 1.1 2.8 1.3 2.2 3.1 3.9 5.4 5 .6.3 1.3.5 2 .6.8.1 1.5 0 2.2-.4.5-.3 1.2-.8 1.4-1.5.2-.7.2-1.4.1-2.1-.1-.2-.3-.3-.5-.4zM26 16c0 5.5-4.5 10-10 10-1.8 0-3.6-.5-5.1-1.3L6 26l1.3-4.8C6.5 19.7 6 17.9 6 16 6 10.5 10.5 6 16 6s10 4.5 10 10z');
      svg.appendChild(path);
      a.appendChild(svg);

      a.addEventListener('mouseenter', function () { a.style.filter = 'brightness(0.95)'; });
      a.addEventListener('mouseleave', function () { a.style.filter = 'none'; });

      document.body.appendChild(a);
    } catch (e) {
      console.error('[WhatsApp Float]', e);
    }
  })();`;

  return new Response(js, { headers });
}

