/*! NOGA MT UFIBER Guide – host-page helper.
 *  Receives postMessage events from the guide iframe: auto height and "scroll to the top of the guide".
 *  The iframe is sandboxed (opaque origin), so messages are matched by the iframe's window, not by origin. */
(function () {
	'use strict';
	var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	function findFrame(source) {
		var frames = document.querySelectorAll('.nufg__frame');
		for (var i = 0; i < frames.length; i++) {
			if (frames[i].contentWindow === source) { return frames[i]; }
		}
		return null;
	}

	// If the page was opened with a shared setup, hand it to the guide.
	window.addEventListener('DOMContentLoaded', function () {
		var m = location.hash.match(/[#&]ufiber=([A-Za-z0-9\-_]+)/);
		if (!m) { return; }
		document.querySelectorAll('.nufg__frame').forEach(function (f) {
			var src = f.getAttribute('src') || '';
			if (src.indexOf('setup=') === -1) {
				f.setAttribute('src', src + (src.indexOf('?') === -1 ? '?' : '&') + 'setup=' + encodeURIComponent(m[1]));
			}
		});
	});

	window.addEventListener('message', function (e) {
		var d = e.data;
		if (!d || d.source !== 'ufiber-guide' || !e.source) { return; }
		var frame = findFrame(e.source);
		if (!frame) { return; }
		var box = frame.closest('.nufg');
		if (d.type === 'whereami') {
			try { e.source.postMessage({ source: 'ufiber-host', type: 'hosturl', url: location.href }, '*'); } catch (err) { }
			return;
		}
		if (d.type === 'setup' && typeof d.token === 'string' && /^[A-Za-z0-9\-_]{1,4000}$/.test(d.token)) {
			try { history.replaceState(null, '', location.pathname + location.search + '#ufiber=' + d.token); } catch (err) { }
			return;
		}
		if (!box || box.getAttribute('data-nufg-fit') !== '1') { return; }

		if (d.type === 'height' && typeof d.height === 'number' && isFinite(d.height) && d.height > 0 && d.height < 30000) {
			frame.style.height = Math.ceil(d.height) + 'px';
			box.classList.add('is-ready');
		} else if (d.type === 'whereami') {
			try { e.source.postMessage({ source: 'ufiber-host', type: 'hosturl', url: location.href }, '*'); } catch (err) { }
		} else if (d.type === 'setup' && typeof d.token === 'string' && /^[A-Za-z0-9\-_]{1,4000}$/.test(d.token)) {
			// keep the page address shareable, without reloading the page
			try { history.replaceState(null, '', location.pathname + location.search + '#ufiber=' + d.token); } catch (err) { }
		} else if (d.type === 'navigate') {
			var offset = parseInt(box.getAttribute('data-nufg-offset'), 10) || 0;
			var top = box.getBoundingClientRect().top;
			// Only when the top of the guide has scrolled out of view.
			if (top < offset) {
				window.scrollTo({ top: window.pageYOffset + top - offset - 8, behavior: reduce ? 'auto' : 'smooth' });
			}
		}
	}, false);
})();
