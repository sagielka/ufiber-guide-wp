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

	window.addEventListener('message', function (e) {
		var d = e.data;
		if (!d || d.source !== 'ufiber-guide' || !e.source) { return; }
		var frame = findFrame(e.source);
		if (!frame) { return; }
		var box = frame.closest('.nufg');
		if (!box || box.getAttribute('data-nufg-fit') !== '1') { return; }

		if (d.type === 'height' && typeof d.height === 'number' && isFinite(d.height) && d.height > 0 && d.height < 30000) {
			frame.style.height = Math.ceil(d.height) + 'px';
			box.classList.add('is-ready');
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
