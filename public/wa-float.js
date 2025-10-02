(function(){
  // 读取当前 <script> 上的 ?shop= 参数
  function getParam(name) {
    try {
      const src = document.currentScript && document.currentScript.src;
      if (!src) return null;
      return new URL(src).searchParams.get(name);
    } catch (e) { return null; }
  }

  const shop = getParam('shop') || (window.Shopify && Shopify.shop);
  if (!shop) return;

  fetch(`https://cclab-f120.onrender.com/public/wa-float-config?shop=${encodeURIComponent(shop)}`, {
    mode: 'cors', credentials: 'omit'
  })
  .then(r => r.ok ? r.json() : null)
  .then(cfg => {
    if (!cfg || !cfg.enabled || !cfg.phone) return;

    const a = document.createElement('a');
    a.href = `https://api.whatsapp.com/send?phone=${encodeURIComponent(cfg.phone)}${cfg.presetText ? `&text=${encodeURIComponent(cfg.presetText)}` : ''}`;
    a.target = '_blank';
    a.id = 'wa-float-btn';
    a.style.cssText = `
      position: fixed;
      ${cfg.position === 'left' ? 'left' : 'right'}: 20px;
      bottom: 20px;
      width: 56px; height: 56px; border-radius: 50%;
      background: ${cfg.color || '#25D366'};
      box-shadow: 0 6px 12px rgba(0,0,0,.15);
      display:flex;align-items:center;justify-content:center;
      z-index: 2147483647;
    `;
    a.innerHTML = '<svg viewBox="0 0 32 32" width="28" height="28" fill="#fff"><path d="M19.11 17.39c-.26-.13-1.52-.75-1.76-.84-.24-.09-.41-.13-.58.13-.17.26-.67.84-.82 1.01-.15.17-.3.19-.56.06-.26-.13-1.08-.4-2.05-1.28-.76-.68-1.28-1.52-1.43-1.78-.15-.26-.02-.4.11-.53.11-.11.26-.3.39-.45.13-.15.17-.26.26-.43.09-.17.04-.32-.02-.45-.06-.13-.58-1.39-.79-1.9-.21-.51-.42-.44-.58-.45l-.5-.01c-.17 0-.45.06-.68.32-.24.26-.89.87-.89 2.11s.91 2.45 1.04 2.62c.13.17 1.79 2.73 4.34 3.83.61.26 1.08.41 1.45.53.61.19 1.16.16 1.6.1.49-.07 1.52-.62 1.74-1.22.21-.6.21-1.11.15-1.22-.06-.11-.24-.17-.5-.3zM16 4C9.37 4 4 9.37 4 16c0 2.08.54 4.04 1.49 5.74L4 28l6.4-1.67A11.92 11.92 0 0 0 16 28c6.63 0 12-5.37 12-12S22.63 4 16 4z"/></svg>';

    document.body.appendChild(a);
  })
  .catch(() => {});
})();
