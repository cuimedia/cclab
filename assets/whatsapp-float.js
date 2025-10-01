(function () {
  'use strict';
  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn();}

  ready(function(){
    var root = document.getElementById('wa-float-root');
    if(!root) return;

    // 读取配置与页面类型
    var cfg = {};
    try { cfg = JSON.parse(root.getAttribute('data-config') || '{}'); } catch(e) { cfg = {}; }
    var page = root.getAttribute('data-page') || '';

    // 页面可见性判定
    var showPage = !!cfg.show_everywhere
      || (page==='index'     && cfg.show_on_home)
      || (page==='product'   && cfg.show_on_product)
      || (page==='collection'&& cfg.show_on_collection)
      || (page==='article'   && cfg.show_on_article)
      || (page==='cart'      && cfg.show_on_cart);
    if (!showPage) return;

    // 设备可见性判定
    var isMobile = window.matchMedia('(max-width: 749px)').matches;
    if ((isMobile && cfg.show_on_mobile===false) || (!isMobile && cfg.show_on_desktop===false)) return;

    // 基础参数
    var num = String(cfg.number || '').replace(/\D/g,'');
    if (!/^\d{6,15}$/.test(num)) { console.warn('[WhatsApp Float] Invalid number'); return; }
    var msg       = cfg.message || 'Hello, I need some help with my order.';
    var position  = cfg.position === 'left' ? 'left' : 'right';
    var offsetX   = parseInt(cfg.offset_x || 24, 10);
    var offsetY   = parseInt(cfg.offset_y || 24, 10);
    var size      = parseInt(cfg.size || 56, 10);
    var bg        = cfg.bg_color || '#25D366';
    var icon      = cfg.icon_color || '#fff';
    var openInNew = cfg.open_in_new !== false;

    // Deep link（移动端）+ 回退
    var isMobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    var httpsLink = 'https://wa.me/' + num + (msg ? ('?text=' + encodeURIComponent(msg)) : '');
    var deepLink  = 'whatsapp://send?phone=' + num + (msg ? ('&text=' + encodeURIComponent(msg)) : '');
    var href = isMobileUA ? deepLink : httpsLink;

    var a = document.createElement('a');
    a.href = href;
    a.id = 'wa-floating-btn';
    a.setAttribute('aria-label','Chat on WhatsApp');
    if (openInNew) { a.target = '_blank'; a.rel = 'noopener'; }

    if (isMobileUA) {
      a.addEventListener('click', function(){
        var t = setTimeout(function(){ window.location.href = httpsLink; }, 1200);
        var clear = function(){ clearTimeout(t); document.removeEventListener('visibilitychange', clear); };
        document.addEventListener('visibilitychange', clear, { once: true });
      });
    }

    // 样式
    a.style.cssText = [
      'position:fixed','z-index:9999',
      'width:'+size+'px','height:'+size+'px',
      'border-radius:9999px','display:grid','place-items:center',
      'box-shadow:0 6px 18px rgba(0,0,0,.2)',
      'background:'+bg, 'bottom:'+offsetY+'px',
      (position==='left'?'left':'right')+':'+offsetX+'px'
    ].join(';');

    // 图标
    var svgNS='http://www.w3.org/2000/svg';
    var svg=document.createElementNS(svgNS,'svg');
    svg.setAttribute('viewBox','0 0 32 32');
    svg.setAttribute('width',Math.floor(size*0.55));
    svg.setAttribute('height',Math.floor(size*0.55));
    var path=document.createElementNS(svgNS,'path');
    path.setAttribute('fill',icon);
    path.setAttribute('d','M19.1 17.3c-.3-.2-.6-.3-.8 0-.2.2-.9 1.1-1.1 1.3-.2.2-.4.2-.7.1-2.1-.8-3.6-2.2-4.7-4.1-.2-.2-.2-.5.1-.7.1-.1 1.1-.9 1.2-1.2.1-.3 0-.5 0-.7 0-.2-.7-1.7-.9-2.2-.2-.5-.5-.4-.7-.4h-.6c-.2 0-.5.1-.7.3-.8.8-1.1 1.9-1 3 .1 1 .6 1.9 1.1 2.8 1.3 2.2 3.1 3.9 5.4 5 .6.3 1.3.5 2 .6.8.1 1.5 0 2.2-.4.5-.3 1.2-.8 1.4-1.5.2-.7.2-1.4.1-2.1-.1-.2-.3-.3-.5-.4zM26 16c0 5.5-4.5 10-10 10-1.8 0-3.6-.5-5.1-1.3L6 26l1.3-4.8C6.5 19.7 6 17.9 6 16 6 10.5 10.5 6 16 6s10 4.5 10 10z');
    svg.appendChild(path); a.appendChild(svg);

    a.addEventListener('mouseenter', function(){ a.style.filter='brightness(0.95)'; });
    a.addEventListener('mouseleave', function(){ a.style.filter='none'; });

    document.body.appendChild(a);
  });
})();
