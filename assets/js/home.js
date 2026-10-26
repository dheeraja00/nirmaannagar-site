/* nirmaannagar.com, the home page's script (D-1247, D-1248), served from the site (CSP script-src 'self'). The page works without
   it; this adds the live town and its story (assets/js/town.js: three.js and the game's own models) where the device and the
   connection can take it, else the game's recording; the street's voices on tap, prop cards that turn over, the pothole's
   upgrades, memes to share, the launch bar on phones and a gentle rise as cards come into view. No cookies, no storage, no
   requests beyond the site's own files (a meme's picture, fetched to share it). Motion follows the phone's Reduce Motion
   setting; nothing plays a sound until it is tapped. */
(function () {
  'use strict';
  var doc = document;
  var root = doc.documentElement;
  root.classList.add('js');
  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var conn = navigator.connection || {};
  // Data: Save-Data and a 2G connection keep the page to its pictures. The connection's type is a rough guess (many 4G phones in
  // India read as 3G), so on 3G the town still comes, in its lighter version, once the page is idle; the recording stays off there.
  var sparing = !!conn.saveData || /(^|-)2g/.test(conn.effectiveType || '');
  var slow = sparing || conn.effectiveType === '3g';
  var each = function (selector, fn) { Array.prototype.forEach.call(doc.querySelectorAll(selector), fn); };

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

  // The live town: which kind of device this is, or null for the still. The still stays for Reduce Motion, Save-Data and 2G,
  // without WebGL 2, and on a weak device (under 4 GB of memory or 4 cores, where the browser says); 3G gets the lighter version.
  function townTier() {
    if (reduce.matches || sparing) return null;
    var memory = navigator.deviceMemory || 8;
    var cores = navigator.hardwareConcurrency || 8;
    if (memory < 4 || cores < 4) return null;
    try {
      var gl = doc.createElement('canvas').getContext('webgl2');
      if (!gl) return null;
      var lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    } catch (e) { return null; }
    if (memory === 4) return 'weak';
    return slow || window.matchMedia('(max-width: 899px)').matches ? 'phone' : 'full';
  }

  // After the first paint, once the stage is near the screen: mark the story with the tier and add the town's module, which
  // starts on it. Returns whether the town is coming (then the recording stays a still).
  function startTown() {
    var stage = doc.getElementById('town');
    var story = doc.getElementById('story');
    var tier = stage && story && townTier();
    if (!tier) return false;
    each('.stage-hint', function (hint) { hint.classList.add('soon'); });  // its room kept, so the town does not move when it shows
    story.addEventListener('town:ready', function () {
      each('.stage-hint', function (hint) { hint.hidden = false; });
      each('.duo img', function (img) { img.sizes = '(min-width:900px) 35rem,94vw'; });  // over the town the Missions card is narrower
    });
    function go() {
      if (slow && !go.idle && 'requestIdleCallback' in window) { go.idle = true; window.requestIdleCallback(go, { timeout: 3000 }); return; }
      story.setAttribute('data-town', tier);
      var script = doc.createElement('script');
      script.type = 'module';
      script.src = 'assets/js/town.js';
      doc.head.appendChild(script);
    }
    if ('IntersectionObserver' in window) {
      var near = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { near.disconnect(); go(); }
      }, { rootMargin: '300px' });
      near.observe(stage);
    } else go();
    return true;
  }

  // A muted loop of the game (where the page has one) plays only when motion is welcome and data is not scarce. It runs longer than
  // five seconds, so a button pauses it; it also rests while off screen.
  function startLoop() {
    each('figure[data-loop] .frame', function (frame) {
      if (reduce.matches || slow) return;
      var video = doc.createElement('video');
      video.className = 'loop-video';
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('aria-hidden', 'true');
      video.preload = 'auto';
      video.src = frame.parentNode.getAttribute('data-loop');
      var toggle = doc.createElement('button');
      toggle.type = 'button';
      toggle.className = 'loop-toggle';
      var held = false;
      var visible = true;
      function label() {
        toggle.setAttribute('aria-label', held ? 'Play the moving town' : 'Pause the moving town');
        toggle.setAttribute('data-state', held ? 'paused' : 'playing');
      }
      function sync() {
        if (held || !visible || reduce.matches) video.pause();
        else { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
      }
      toggle.addEventListener('click', function () { held = !held; label(); sync(); });
      video.addEventListener('playing', function () { frame.classList.add('moving'); }, { once: true });
      label();
      frame.appendChild(video);
      frame.appendChild(toggle);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; sync(); }).observe(frame);
      }
      if (reduce.addEventListener) reduce.addEventListener('change', sync);
      sync();
    });
  }

  // The street's lines: each bubble becomes a button that plays the game's own voice for it.
  each('.bubble[data-voice]', function (bubble) {
    var button = doc.createElement('button');
    button.type = 'button';
    button.className = 'bubble-play';
    button.setAttribute('aria-label', 'Hear “' + bubble.textContent.trim() + '”');
    while (bubble.firstChild) button.appendChild(bubble.firstChild);
    bubble.appendChild(button);
    button.addEventListener('click', function () { play(bubble.getAttribute('data-voice'), bubble); });
  });
  each('.voices .hint', function (hint) { hint.hidden = false; });

  // Prop cards turn over to read their line.
  each('.deck .card', function (card) {
    var name = card.querySelector('.card-name');
    var button = doc.createElement('button');
    button.type = 'button';
    button.className = 'card-turn';
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', 'Turn over: ' + (name ? name.textContent : 'card'));
    card.appendChild(button);
    card.classList.add('turnable');
    button.addEventListener('click', function () {
      var turned = card.classList.toggle('turned');
      button.setAttribute('aria-pressed', turned ? 'true' : 'false');
    });
  });

  // The pothole grows: an Upgrade button walks its four levels, as in the game.
  each('.grow', function (grow) {
    var steps = grow.querySelectorAll('.grow-step');
    if (steps.length < 2) return;
    var level = 0;
    var bar = doc.createElement('div');
    bar.className = 'grow-bar';
    var status = doc.createElement('p');
    status.className = 'grow-status';
    status.setAttribute('aria-live', 'polite');
    var button = doc.createElement('button');
    button.type = 'button';
    button.className = 'button grow-button';
    bar.appendChild(status);
    bar.appendChild(button);
    grow.appendChild(bar);
    grow.classList.add('stepper');
    function show(pop) {
      Array.prototype.forEach.call(steps, function (step, i) { step.classList.toggle('on', i === level); });
      status.textContent = steps[level].querySelector('.grow-name').textContent;
      button.textContent = level < steps.length - 1 ? 'Upgrade · 280 coins' : 'Start again';
      if (pop && !reduce.matches) { grow.classList.remove('popped'); void grow.offsetWidth; grow.classList.add('popped'); }
    }
    button.addEventListener('click', function () { level = (level + 1) % steps.length; show(level > 0); });
    show(false);
  });

  // Memes: where the phone can share a picture, a Share button beside the Download link sends the game's own upright card
  // (NAME-share.jpg beside the square NAME.jpg).
  var file = function (name) { try { return new File([''], name, { type: 'image/jpeg' }); } catch (e) { return null; } };
  var probe = file('probe.jpg');
  if (probe && navigator.canShare && navigator.share && navigator.canShare({ files: [probe] })) {
    each('.meme-save', function (link) {
      var button = doc.createElement('button');
      button.type = 'button';
      button.className = 'meme-share';
      button.textContent = 'Share';
      link.parentNode.insertBefore(button, link);
      button.addEventListener('click', function () {
        fetch(link.getAttribute('href').replace(/\.jpg$/, '-share.jpg')).then(function (r) { if (!r.ok) throw r; return r.blob(); }).then(function (blob) {
          var picture = new File([blob], link.getAttribute('download'), { type: 'image/jpeg' });
          return navigator.share({ files: [picture], title: 'Nirmaan Nagar', text: 'Made in Nirmaan Nagar' });
        }).catch(function () { /* cancelled, or the share sheet refused: the Download link is beside it */ });
      });
    });
  }

  // On a phone, once the stage has scrolled away, the launch call waits in a bar along the bottom (not over the launch chapter
  // or the footer, which carry it themselves).
  each('.launch-bar', function (bar) {
    var stage = doc.getElementById('town');
    if (!stage || !('IntersectionObserver' in window)) return;
    var seen = new Map();
    var watch = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { seen.set(entry.target, entry.isIntersecting); });
      var showing = false;
      seen.forEach(function (on) { showing = showing || on; });
      bar.hidden = showing;
      root.classList.toggle('bar-on', !showing && window.matchMedia('(max-width: 759px)').matches);
    });
    each('#town, #launch, .foot', function (el) { seen.set(el, false); watch.observe(el); });
  });

  // Sections rise into view as they arrive (not with Reduce Motion, and only where the browser can tell).
  if (!reduce.matches && 'IntersectionObserver' in window) {
    var arriving = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('shown'); arriving.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    each('.chapter-card, .chapter-art, .contact .wrap', function (el) { el.classList.add('reveal'); arriving.observe(el); });
  }

  function afterPaint() {
    if (!startTown()) startLoop();
  }
  if (doc.readyState === 'complete') setTimeout(afterPaint, 200);
  else window.addEventListener('load', function () { setTimeout(afterPaint, 200); });
})();
