/* =========================================================================
   fx.js - feedback effects ("bling") and sounds for Riddle Me Rika
   -------------------------------------------------------------------------
   - Particles / confetti on ONE canvas overlay. It is created on first use,
     and its animation loop only runs while something is moving.
   - Sounds are synthesized with the Web Audio API (no audio files). The
     AudioContext starts on the first tap / key (iOS needs a user gesture).
   - prefers-reduced-motion: no particles / confetti (sounds still play).
   Tune everything in the FX block below. CSS animations (pop, flip, glow,
   combo badge...) have their own variables in cards.css ("Feedback").
   game.js calls window.RikaFX; if this file is missing the game still works.
   ========================================================================= */
(function (root) {
  'use strict';

  /* ---- FX: all knobs in one place --------------------------------------- */
  var FX = {
    // palette: mint, pink, peach, cream (+ a warm gold for stars)
    colors: ['#cdf2ca', '#ffdefa', '#ffc898', '#f9f3df', '#ffd76a'],
    sparkle: { count: 14, speed: 3.2, size: 5, life: 520 },    // correct placement
    complete: { count: 70, speed: 6.5, size: 7, life: 1300 },  // category completed (tier colours + palette)
    winRain: { perSecond: 150, duration: 2600, size: 8 },      // full-screen confetti on a win
    gravity: 0.16,                                             // px / frame² (confetti falls)
    maxParticles: 260,
    volume: 0.35,                                              // master volume 0..1
    comboStep: 2,                                              // semitones the combo chime climbs per step
    comboMax: 12                                               // highest combo step for the chime pitch
  };

  var KEY_SOUND = 'rr:sound';
  var doc = root.document;

  function reduced() {
    try { return root.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  /* ---- particles -------------------------------------------------------- */
  var canvas = null, ctx2d = null, parts = [], rain = null, running = false, dpr = 1, last = 0;

  function ensureCanvas() {
    if (canvas) return true;
    if (!doc || !doc.body) return false;
    canvas = doc.createElement('canvas');
    canvas.className = 'fx-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(canvas);
    ctx2d = canvas.getContext('2d');
    size();
    root.addEventListener('resize', size);
    return !!ctx2d;
  }

  function size() {
    if (!canvas) return;
    dpr = Math.min(2, root.devicePixelRatio || 1);
    canvas.width = Math.round(root.innerWidth * dpr);
    canvas.height = Math.round(root.innerHeight * dpr);
  }

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function add(p) {
    if (parts.length >= FX.maxParticles) parts.shift();
    parts.push(p);
  }

  function start() {
    if (running) return;
    running = true;
    last = 0;
    root.requestAnimationFrame(frame);
  }

  function frame(ts) {
    var dt = last ? Math.min(3, (ts - last) / 16.7) : 1; // in 60-fps frames
    last = ts;
    if (rain) {
      var left = rain.until - ts;
      if (left <= 0) rain = null;
      else {
        rain.acc += FX.winRain.perSecond * dt / 60;
        while (rain.acc >= 1) {
          rain.acc -= 1;
          add(confettiPiece(rnd(0, root.innerWidth), rnd(-60, -10), rain.colors, FX.winRain.size, rnd(-1.2, 1.2), rnd(2.5, 5), 4000));
        }
      }
    }
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx2d.clearRect(0, 0, root.innerWidth, root.innerHeight);
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.age += dt * 16.7;
      if (p.age >= p.life || p.y > root.innerHeight + 30) { parts.splice(i, 1); continue; }
      p.vy += (p.g || 0) * dt;
      p.vx *= p.drag; p.vy *= p.drag;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vr * dt;
      var a = 1 - Math.max(0, (p.age - p.life * 0.6) / (p.life * 0.4)); // fade in the last 40%
      ctx2d.globalAlpha = Math.max(0, a);
      ctx2d.fillStyle = p.color;
      if (p.kind === 'star') drawStar(p.x, p.y, p.size * (1 - p.age / p.life * 0.5), p.rot);
      else {
        ctx2d.save();
        ctx2d.translate(p.x, p.y);
        ctx2d.rotate(p.rot);
        ctx2d.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2 * (0.4 + 0.6 * Math.abs(Math.cos(p.rot * 2))));
        ctx2d.restore();
      }
    }
    ctx2d.globalAlpha = 1;
    if (parts.length || rain) root.requestAnimationFrame(frame);
    else { running = false; ctx2d.clearRect(0, 0, root.innerWidth, root.innerHeight); }
  }

  function drawStar(x, y, r, rot) {
    ctx2d.beginPath();
    for (var i = 0; i < 8; i++) {
      var rr = i % 2 ? r * 0.42 : r;
      var ang = rot + i * Math.PI / 4;
      ctx2d.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
    }
    ctx2d.closePath();
    ctx2d.fill();
  }

  function confettiPiece(x, y, colors, sz, vx, vy, life) {
    return {
      kind: 'rect', x: x, y: y, vx: vx, vy: vy, g: FX.gravity, drag: 0.99,
      rot: rnd(0, Math.PI), vr: rnd(-0.25, 0.25), size: sz * rnd(0.7, 1.3),
      color: colors[Math.floor(Math.random() * colors.length)], age: 0, life: life
    };
  }

  /** Small star sparkle at (x, y) (viewport px), e.g. where a card landed. */
  function sparkle(x, y, colors) {
    if (reduced() || !ensureCanvas()) return;
    var c = colors || FX.colors, n = FX.sparkle.count;
    for (var i = 0; i < n; i++) {
      var ang = (i / n) * Math.PI * 2 + rnd(-0.2, 0.2), sp = FX.sparkle.speed * rnd(0.5, 1.2);
      add({ kind: 'star', x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, g: 0.02, drag: 0.92,
        rot: rnd(0, 3), vr: rnd(-0.2, 0.2), size: FX.sparkle.size * rnd(0.6, 1.2),
        color: c[i % c.length], age: 0, life: FX.sparkle.life * rnd(0.7, 1.1) });
    }
    start();
  }

  /** Confetti burst over a rectangle (a completed field), in the given colours. */
  function celebrate(rect, colors) {
    if (reduced() || !ensureCanvas()) return;
    var c = (colors || []).concat(FX.colors), n = FX.complete.count;
    var cx = rect.left + rect.width / 2, cy = rect.top + rect.height * 0.35;
    for (var i = 0; i < n; i++) {
      var ang = rnd(-Math.PI * 0.95, -Math.PI * 0.05), sp = FX.complete.speed * rnd(0.4, 1.1);
      if (i % 3 === 0) {
        add({ kind: 'star', x: cx, y: cy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, g: FX.gravity * 0.6, drag: 0.97,
          rot: rnd(0, 3), vr: rnd(-0.2, 0.2), size: FX.complete.size * rnd(0.6, 1.1),
          color: c[i % c.length], age: 0, life: FX.complete.life });
      } else {
        add(confettiPiece(cx + rnd(-rect.width / 3, rect.width / 3), cy, c, FX.complete.size,
          Math.cos(ang) * sp, Math.sin(ang) * sp, FX.complete.life * rnd(0.8, 1.2)));
      }
    }
    start();
  }

  /** Full-screen confetti rain (win). */
  function rainConfetti(colors) {
    if (reduced() || !ensureCanvas()) return;
    rain = { until: (root.performance ? root.performance.now() : Date.now()) + FX.winRain.duration, acc: 0,
      colors: (colors || []).concat(FX.colors) };
    start();
  }

  /** Stop everything (e.g. on restart). */
  function clear() {
    parts = [];
    rain = null;
  }

  /* ---- sound ------------------------------------------------------------ */
  var actx = null, master = null, enabled = true;
  try { enabled = root.localStorage.getItem(KEY_SOUND) !== '0'; } catch (e) { enabled = true; }

  function unlock() {
    if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return;
    try {
      actx = new AC();
      master = actx.createGain();
      master.gain.value = FX.volume;
      master.connect(actx.destination);
    } catch (e) { actx = null; }
  }
  if (doc) {
    ['pointerdown', 'keydown', 'touchend'].forEach(function (ev) {
      doc.addEventListener(ev, unlock, { capture: true, passive: true });
    });
  }

  /** One tone: frequency (Hz), start offset (s), duration (s), wave type, gain, optional end frequency. */
  function tone(f, at, dur, type, g, f2) {
    if (!enabled || !actx || !master) return;
    var t0 = actx.currentTime + at;
    var o = actx.createOscillator(), v = actx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    v.gain.setValueAtTime(0.0001, t0);
    v.gain.exponentialRampToValueAtTime(g || 0.3, t0 + 0.012);
    v.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(v); v.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  var sound = {
    /** soft tick; with combo >= 2 a chime that climbs with the combo */
    place: function (combo) {
      tone(1100, 0, 0.05, 'sine', 0.22);
      if (combo >= 2) {
        var step = Math.min(FX.comboMax, combo - 1) * FX.comboStep;
        tone(523.25 * Math.pow(2, step / 12), 0.03, 0.22, 'triangle', 0.22);
      }
    },
    flip: function () { tone(320, 0, 0.09, 'sine', 0.18, 820); },
    wrong: function () { tone(170, 0, 0.18, 'square', 0.12, 95); tone(120, 0.04, 0.16, 'sine', 0.2, 80); },
    discard: function () { tone(600, 0, 0.06, 'sine', 0.12, 420); },
    complete: function () {
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { tone(f, i * 0.075, 0.22, 'triangle', 0.25); });
    },
    win: function () {
      [392, 523.25, 659.25, 783.99].forEach(function (f, i) { tone(f, i * 0.12, 0.2, 'triangle', 0.28); });
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f) { tone(f, 0.5, 0.8, 'triangle', 0.18); });
    },
    lose: function () { tone(392, 0, 0.3, 'sine', 0.14, 330); tone(330, 0.25, 0.45, 'sine', 0.12, 262); }
  };

  function setSound(on) {
    enabled = !!on;
    try { root.localStorage.setItem(KEY_SOUND, enabled ? '1' : '0'); } catch (e) { /* ignore */ }
  }

  root.RikaFX = {
    FX: FX, reduced: reduced,
    sparkle: sparkle, celebrate: celebrate, rain: rainConfetti, clear: clear,
    sound: sound, setSound: setSound, soundOn: function () { return enabled; },
    isAnimating: function () { return running; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
