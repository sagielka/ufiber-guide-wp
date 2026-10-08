
/* Installable and usable with no connection, but only when the guide is served as its own
   page over http(s). Inside the WordPress frame, or opened from a file, this does nothing. */
(function () {
  try {
    var ownPage = window.top === window.self;
    var web = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!ownPage || !web) return;
    var l = document.createElement('link'); l.rel = 'manifest'; l.href = './manifest.webmanifest';
    document.head.appendChild(l);
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () { navigator.serviceWorker.register('./sw.js').catch(function () {}); });
    }
  } catch (e) { }
})();
