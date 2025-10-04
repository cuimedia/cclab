(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else { fn(); }
  }

  ready(function(){
    var root = document.getElementById('wa-float-root');
    if (!root) return;

    // 读取自定义属性（来自 Theme Editor 设置）
    var num = (root.getAttribute('data-number') || '').replace(/\D/g,'');
    var msg = root.getAttribute('data-message') || '';
    var position = root.getAttribute('data-position') === 'left' ? 'left' : 'right';
    var offsetX = parseInt(root.getAttribute('data-offset-x') || '24', 10);
    var offsetY = parseInt(root.getAttribute('data-offset-y') || '24', 10);
    var size = parseInt(root.getAttribute('data-size') || '56', 10);
    var bg = root.getAttribute('data-bg') || '#25D366';
    var icon = root.getAttribute('data-icon') || '#fff';
    var showMobile = root.getAttribute('data-mobile') === 'true';
    var showDesktop = root.getAttribute('data-desktop') === 'true';
    var openInNew = root.getAttribute('data-open-in-new') === 'true';

    // 设备可见性
    var isMobileViewport = window.matchMedia('(max-width: 749px)').matches;
    if ((isMobileViewport && !showMobile) || (!isMobileViewport && !showDesktop)) return;

    // 号码校验
    if (!/^\d{6,15}$/.test(num)) {
      console.warn('[WhatsApp Float] Invalid number format.');
      return;
    }

    // Deep link（移动端）+ 回退
    var isMobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    var httpsLink = 'https://wa.me/' + num + (msg ? ('?text=' + encodeURIComponent(msg)) : '');
    var deepLink  = 'whatsapp://send?phone=' + num + (msg ? ('&text=' + encodeURIComponent(msg)) : '');
    var href = isMobileUA ? deepLink : httpsLink;

    var a = document.createElement('a');
    a.href = href;
    a.setAttribute('aria-label', 'Chat on WhatsApp');
    a.setAttribute('id', 'wa-floating-btn');
    if (openInNew) { a.setAttribute('target','_blank'); a.setAttribute('rel','noopener'); }

    if (isMobileUA) {
      a.addEventListener('click', function(){
        var t = setTimeout(function(){ window.location.href = httpsLink; }, 1200);
        var clear = function(){ clearTimeout(t); document.removeEventListener('visibilitychange', clear); };
        document.addEventListener('visibilitychange', clear, { once: true });
      });
    }

    // 样式
    a.style.position = 'fixed';
    a.style.zIndex = '9999';
    a.style.width = size + 'px';
    a.style.height = size + 'px';
    a.style.borderRadius = '9999px';
    a.style.display = 'grid';
    a.style.placeItems = 'center';
    a.style.boxShadow = '0 6px 18px rgba(0,0,0,.2)';
    a.style.background = bg;
    a.style.bottom = offsetY + 'px';
    a.style[ position === 'left' ? 'left' : 'right' ] = offsetX + 'px';

    // 图标
    var svgNS='http://www.w3.org/2000/svg';
    var svg=document.createElementNS(svgNS,'svg');
    svg.setAttribute('viewBox','0 0 32 32');
    svg.setAttribute('width',Math.floor(size*0.55));
    svg.setAttribute('height',Math.floor(size*0.55));
    svg.setAttribute('aria-hidden','true');
    var path=document.createElementNS(svgNS,'path');
    path.setAttribute('fill',icon);
    path.setAttribute('d','M19.1 17.3c-.3-.2-.6-.3-.8 0-.2.2-.9 1.1-1.1 1.3-.2.2-.4.2-.7.1-2.1-.8-3.6-2.2-4.7-4.1-.2-.2-.2-.5.1-.7.1-.1 1.1-.9 1.2-1.2.1-.3 0-.5 0-.7 0-.2-.7-1.7-.9-2.2-.2-.5-.5-.4-.7-.4h-.6c-.2 0-.5.1-.7.3-.8.8-1.1 1.9-1 3 .1 1 .6 1.9 1.1 2.8 1.3 2.2 3.1 3.9 5.4 5 .6.3 1.3.5 2 .6.8.1 1.5 0 2.2-.4.5-.3 1.2-.8 1.4-1.5.2-.7.2-1.4.1-2.1-.1-.2-.3-.3-.5-.4zM26 16c0 5.5-4.5 10-10 10-1.8 0-3.6-.5-5.1-1.3L6 26l1.3-4.8C6.5 19.7 6 17.9 6 16 6 10.5 10.5 6 16 6s10 4.5 10 10z');
    svg.appendChild(path); a.appendChild(svg);

    a.addEventListener('mouseenter', function(){ a.style.filter='brightness(0.95)'; });
    a.addEventListener('mouseleave', function(){ a.style.filter='none'; });

    document.body.appendChild(a);
  });
})();
