/* ============================================================
   UFIBER Guide — embed mode (only when loaded with ?embed=1)
   Talks to the host page (WordPress plugin) with postMessage:
     {source:'ufiber-guide', type:'height', height}   auto-fit height
     {source:'ufiber-guide', type:'navigate'}         view changed
   ============================================================ */
(function () {
  if (typeof EMB === 'undefined' || !EMB) return;
  const root = document.documentElement;
  root.classList.add('emb');
  if (EMB.fit) root.classList.add('emb-fit');
  if (!EMB.brand) root.classList.add('emb-nobrand');
  const post = m => { try { parent.postMessage(Object.assign({ source: 'ufiber-guide' }, m), '*'); } catch (e) { } };
  // The host page owns the address bar, so ask it for the page URL (used by
  // "Copy link to this setup") and let it know whenever the setup changes.
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (d && d.source === 'ufiber-host' && d.type === 'hosturl' && typeof d.url === 'string') APP.hostUrl = d.url;
  });
  post({ type: 'whereami' });

  if (!EMB.fit) return;

  // Narrow containers: all sections as a scrollable strip under the header (a fixed bottom bar is useless in an auto-height frame)
  const tb = document.getElementById('tabbar');
  if (tb) {
    tb.innerHTML = [['#/', 'find', 'Find', I.find], ['#/speeds', 'speeds', 'Speeds', I.gauge], ['#/fix', 'fix', 'Fix', I.fix], ['#/replace', 'replace', 'XEBEC', I.swap], ['#/learn', 'learn', 'Learn', I.learn], ['#/products', 'products', 'Products', I.prod]]
      .map(([h, k, l, ic]) => `<a href="${h}" data-navk="${k}">${ic}<span>${l}</span></a>`).join('');
    try { document.querySelectorAll('[data-navk]').forEach(a => a.setAttribute('aria-current', 'false')); route(true); } catch (e) { }
  }

  let last = 0, raf = 0;
  const measure = () => { raf = 0; const h = Math.ceil(document.body.getBoundingClientRect().height); if (h > 0 && Math.abs(h - last) > 1) { last = h; post({ type: 'height', height: h }); } };
  const sched = () => { if (!raf) raf = requestAnimationFrame(measure); };
  if ('ResizeObserver' in window) new ResizeObserver(sched).observe(document.body);
  window.addEventListener('load', sched); window.addEventListener('resize', sched);
  new MutationObserver(sched).observe(document.body, { childList: true, subtree: true, attributes: false });
  sched();

  // After a real navigation tell the host to bring the top of the guide into view
  const _route = route;
  route = function (keepScroll) { _route.apply(this, arguments); if (!keepScroll) post({ type: 'navigate' }); sched(); };
})();
