/* nirmaannagar.com's home page script (O.8), served from the site (CSP script-src 'self'). The page works without it: every
   picture, word and link is there, the pause switch is CSS, the street's lines show their words. This adds: the street's voices
   on a tap (the game's own recordings; nothing makes a sound until tapped), Share for the page, the pause switch for browsers
   without :has(), a keyboard stop for any row that scrolls sideways, the bar's Join the beta stepping aside at the join steps,
   and the live 3D town when someone asks for it.
   No cookies, no storage, no requests beyond the site's own files. */
(function () {
  'use strict';
  var doc = document;
  var root = doc.documentElement;
  root.classList.add('js');
  var each = function (selector, fn) { Array.prototype.forEach.call(doc.querySelectorAll(selector), fn); };

  // The pause switch is a checkbox the CSS reads with :has(); for browsers without :has() the page carries a class too.
  var still = doc.getElementById('still');
  if (still) still.addEventListener('change', function () { root.classList.toggle('held', still.checked); });

  // The bar's Join the beta steps aside while the join steps themselves are on screen (a quarter of them or more).
  var joinSteps = doc.getElementById('join');
  if (joinSteps && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) { root.classList.toggle('join-near', entries[0].isIntersecting); }, { threshold: 0.25 }).observe(joinSteps);
  }

  // One player for every sound, so the street never talks over itself.
  var player = null;
  var playing = null;
  function play(src, owner) {
    try {
      if (!player) player = new Audio();
      player.pause();
      if (playing) playing.classList.remove('speaking');
      playing = owner || null;
      if (playing) playing.classList.add('speaking');
      player.src = src;
      player.onended = player.onerror = function () { if (playing) playing.classList.remove('speaking'); playing = null; };
      var started = player.play();
      if (started && started.catch) started.catch(player.onended);
    } catch (e) { /* no sound: the page carries on */ }
  }

  // The street's lines: each becomes a button, with a play mark, that plays the game's own voice for it.
  each('.bubble[data-voice]', function (bubble) {
    var button = doc.createElement('button');
    button.type = 'button';
    button.className = 'bubble-play';
    var say = bubble.querySelector('.say');
    var means = bubble.querySelector('.means');
    button.setAttribute('aria-label', 'Hear “' + (say ? say.textContent : '') + '”' + (means ? ' (' + means.textContent + ')' : ''));
    var mark = doc.createElement('span');
    mark.className = 'mark';
    mark.setAttribute('aria-hidden', 'true');
    mark.innerHTML = '<svg viewBox="0 0 36 36" focusable="false"><path d="M14 11l12 7-12 7z"/></svg>';
    button.appendChild(mark);
    while (bubble.firstChild) button.appendChild(bubble.firstChild);
    bubble.appendChild(button);
    button.addEventListener('click', function () { play(bubble.getAttribute('data-voice'), bubble); });
  });

  // Any row that scrolls sideways: while it does, a keyboard can reach it and scroll it (a tab stop named after its section's
  // heading); once it fits, it is a plain list again.
  each('.photos, .boards, .wall, .programme', function (row) {
    var section = row.closest ? row.closest('section') : null;
    var title = section ? section.querySelector('h2') : null;
    var fit = function () {
      var scrolls = /auto|scroll/.test(window.getComputedStyle(row).overflowX);
      if (scrolls && row.scrollWidth > row.clientWidth + 1) {
        row.setAttribute('tabindex', '0');
        row.setAttribute('aria-label', (title ? title.textContent : 'This row') + ', scrolls sideways');
      } else {
        row.removeAttribute('tabindex');
        row.removeAttribute('aria-label');
      }
    };
    fit();
    window.addEventListener('resize', fit);
  });

  // Sharing the page itself (the share sheet, or the link copied).
  each('.share-line', function (line) {
    var canonical = doc.querySelector('link[rel="canonical"]');
    var url = canonical ? canonical.href : location.href;
    var button = line.querySelector('.share-page');
    var said = line.querySelector('.share-said');
    if (navigator.share) {
      button.addEventListener('click', function () {
        navigator.share({ title: 'Nirmaan Nagar', text: 'A little city, a glorious mess. The beta is open.', url: url }).catch(function () {});
      });
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      button.textContent = 'Copy the link';
      button.addEventListener('click', function () {
        navigator.clipboard.writeText(url).then(function () { said.textContent = 'Link copied. Send it to the friend whose street looks like this.'; },
          function () { said.textContent = url; });
      });
    } else return;
    line.hidden = false;
  });

  // The live town, only when asked: WebGL 2 and a phone of 4 GB and 4 cores or more (where the browser says); its module and
  // models (web/town, three.js) load on the tap, its stylesheet with them. The still stays until the town is ready.
  each('#poke-stage', function (stage) {
    var go = doc.querySelector('.poke-go');
    var note = doc.querySelector('.poke-note');
    var memory = navigator.deviceMemory || 8;
    var cores = navigator.hardwareConcurrency || 8;
    var gl = null;
    try { gl = doc.createElement('canvas').getContext('webgl2'); var lose = gl && gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext(); } catch (e) { gl = null; }
    if (!go) return;
    if (!gl || memory < 4 || cores < 4) {
      if (note) note.textContent = 'The live town needs a bigger phone or a newer browser than this one; here is its picture.';
      return;
    }
    var tier = memory === 4 ? 'weak' : window.matchMedia('(max-width: 899px)').matches ? 'phone' : 'full';
    go.hidden = false;
    go.addEventListener('click', function () {
      go.disabled = true;
      go.textContent = 'Waking up the town…';
      var css = doc.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'assets/town.css';
      doc.head.appendChild(css);
      var failed = setTimeout(function () {
        go.hidden = true;
        if (note) note.textContent = 'The town could not wake up in this browser; its picture stays.';
      }, 35000);
      stage.addEventListener('town:ready', function () {
        clearTimeout(failed);
        go.hidden = true;
        if (note) note.textContent = 'Tap the pothole, the cow, an auto or the signal. The speaker button turns the sound on.';
      }, { once: true });
      stage.setAttribute('data-town', tier);
      var script = doc.createElement('script');
      script.type = 'module';
      script.src = 'assets/js/town.js';
      doc.head.appendChild(script);
    });
  });
})();
