/* =========================================================================
   Riddle Me Rika - game logic
   -------------------------------------------------------------------------
   Two parts:
   1. Core  - pure functions (no DOM, no storage). Exported for node tests
              via module.exports and exposed in the browser as window.RikaCore.
   2. UI    - DOM rendering, pointer/touch handling, persistence, modals.
              Only runs when a `document` exists.
   Categories come from window.CATEGORIES (categories.js).
   ========================================================================= */
(function (root) {
  'use strict';

  /* ---- CONFIG ---------------------------------------------------------- */
  var FIELDS = 4;               // fields below the piles
  var CATEGORIES_PER_GAME = 6;  // categories in one daily game
  var CARDS_PER_CATEGORY = 4;   // cards per category (= cards to complete a field)
  var MAX_TIER = 1;             // only categories with tier <= MAX_TIER are used
  var SYMBOL_DIR = 'assets/symbols/';
  var SYMBOL_EXT = 'png';       // symbol file extension (assets/symbols/<symbol>.<ext>)

  /* =======================================================================
     1. CORE
     ======================================================================= */
  var Core = (function () {
    var EPOCH_UTC = Date.UTC(2026, 10, 14); // 2026-11-14 = puzzle #1
    var DAY_MS = 86400000;

    /** Whole local calendar days since 2026-11-14 (DST-safe). */
    function dayNumber(date) {
      var d = date || new Date();
      var utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
      return Math.round((utc - EPOCH_UTC) / DAY_MS);
    }

    /** Local Date (midnight) for a given day number. */
    function dateForDay(day) {
      return new Date(2026, 10, 14 + day);
    }

    /** Milliseconds from `now` until the next local midnight. */
    function msUntilMidnight(now) {
      var n = now || new Date();
      var next = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1);
      return Math.max(0, next.getTime() - n.getTime());
    }

    function formatCountdown(ms) {
      var s = Math.max(0, Math.floor(ms / 1000));
      var hh = Math.floor(s / 3600);
      var mm = Math.floor((s % 3600) / 60);
      var ss = s % 60;
      return [hh, mm, ss].map(function (v) { return v < 10 ? '0' + v : String(v); }).join(':');
    }

    function mulberry32(seed) {
      var a = seed >>> 0;
      return function () {
        a = (a + 0x6D2B79F5) | 0;
        var t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    function seedForDay(day) {
      return (Math.imul(day + 1, 2654435761) ^ 0x52494B41) >>> 0;
    }

    /** Fisher-Yates using the given rng. Returns a new array. */
    function shuffleWith(arr, rng) {
      var a = arr.slice();
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(rng() * (i + 1));
        var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
      }
      return a;
    }

    function tierOf(c) { return typeof c.tier === 'number' ? c.tier : 1; }

    function validCard(cd) {
      return cd && (typeof cd.word === 'string' || typeof cd.word === 'number') && String(cd.word).length > 0;
    }

    /** Categories usable today, sorted by id so file order does not matter. */
    function eligibleCategories(list) {
      if (!Array.isArray(list)) return [];
      return list.filter(function (c) {
        return c && typeof c.id === 'string' && typeof c.theme === 'string' &&
          tierOf(c) <= MAX_TIER && Array.isArray(c.cards) &&
          c.cards.filter(validCard).length >= CARDS_PER_CATEGORY;
      }).sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; });
    }

    /**
     * The daily game: same for everyone on a given day.
     * Returns { cats:[{id,theme,tier}], cards:[{id,word,symbol,cat}], order:[ids], sig }
     * or null if the pool is too small.
     */
    function buildGame(list, day) {
      var pool = eligibleCategories(list);
      if (pool.length < CATEGORIES_PER_GAME) return null;
      var rng = mulberry32(seedForDay(day));
      var picked = shuffleWith(pool, rng).slice(0, CATEGORIES_PER_GAME);
      var cats = [], cards = [];
      picked.forEach(function (c, ci) {
        cats.push({ id: c.id, theme: c.theme, tier: tierOf(c) });
        shuffleWith(c.cards.filter(validCard), rng).slice(0, CARDS_PER_CATEGORY).forEach(function (cd) {
          cards.push({ id: cards.length, word: String(cd.word), symbol: cd.symbol ? String(cd.symbol) : '', cat: ci });
        });
      });
      var order = shuffleWith(cards.map(function (c) { return c.id; }), rng);
      var sig = cats.map(function (c) { return c.id; }).join(',') + '|' +
        cards.map(function (c) { return c.word; }).join(',') + '|' + order.join(',');
      return { cats: cats, cards: cards, order: order, sig: sig };
    }

    function emptyFields() {
      var f = [];
      for (var i = 0; i < FIELDS; i++) f.push([]);
      return f;
    }

    function newGame(game, day) {
      return {
        v: 2,
        day: day,
        sig: game.sig,
        draw: game.order.slice(),   // draw[0] is the top card
        discard: [],                // last element is the top card
        fields: emptyFields(),      // card ids per field, bottom first
        done: [],                   // completed category indices, in order
        mistakes: 0,
        moves: 0,
        status: 'playing',          // 'playing' | 'won'
        recorded: false             // stats already updated?
      };
    }

    function isInt(n) { return typeof n === 'number' && isFinite(n) && Math.floor(n) === n; }

    /** Validate a saved state against today's game. Returns state or null. */
    function restoreState(obj, game, day) {
      try {
        if (!obj || obj.v !== 2 || obj.day !== day || obj.sig !== game.sig) return null;
        if (!Array.isArray(obj.draw) || !Array.isArray(obj.discard) || !Array.isArray(obj.done)) return null;
        if (!Array.isArray(obj.fields) || obj.fields.length !== FIELDS) return null;
        if (!isInt(obj.mistakes) || obj.mistakes < 0 || !isInt(obj.moves) || obj.moves < 0) return null;
        if (obj.status !== 'playing' && obj.status !== 'won') return null;
        var nCards = game.cards.length;
        var seen = {};
        function take(id) {
          if (!isInt(id) || id < 0 || id >= nCards || seen[id]) return false;
          seen[id] = true;
          return true;
        }
        var doneSeen = {};
        for (var d = 0; d < obj.done.length; d++) {
          var cat = obj.done[d];
          if (!isInt(cat) || cat < 0 || cat >= game.cats.length || doneSeen[cat]) return null;
          doneSeen[cat] = true;
          for (var k = 0; k < nCards; k++) if (game.cards[k].cat === cat && !take(k)) return null;
        }
        var all = obj.draw.concat(obj.discard);
        for (var i = 0; i < all.length; i++) if (!take(all[i])) return null;
        var fieldCats = {};
        for (var f = 0; f < FIELDS; f++) {
          var ids = obj.fields[f];
          if (!Array.isArray(ids) || ids.length >= CARDS_PER_CATEGORY) return null;
          for (var j = 0; j < ids.length; j++) {
            if (!take(ids[j])) return null;
            if (game.cards[ids[j]].cat !== game.cards[ids[0]].cat) return null;
          }
          if (ids.length) {
            var fc = game.cards[ids[0]].cat;
            if (fieldCats[fc] || doneSeen[fc]) return null;
            fieldCats[fc] = true;
          }
        }
        if (Object.keys(seen).length !== nCards) return null;
        if ((obj.status === 'won') !== (obj.done.length === game.cats.length)) return null;
        return obj;
      } catch (e) {
        return null;
      }
    }

    function topCard(state, from) {
      if (from === 'draw') return state.draw.length ? state.draw[0] : null;
      if (from === 'discard') return state.discard.length ? state.discard[state.discard.length - 1] : null;
      return null;
    }

    /** Category index of field f, or null if empty. */
    function fieldCat(state, game, f) {
      var ids = state.fields[f];
      return ids && ids.length ? game.cards[ids[0]].cat : null;
    }

    /** Why card `id` may not go on field f: null (fits) | 'mismatch' | 'active'. */
    function placeReject(state, game, id, f) {
      var cat = game.cards[id].cat;
      var fc = fieldCat(state, game, f);
      if (fc !== null) return fc === cat ? null : 'mismatch';
      for (var o = 0; o < FIELDS; o++) {
        if (o !== f && fieldCat(state, game, o) === cat) return 'active';
      }
      return null;
    }

    function takeFrom(state, from) {
      return from === 'draw' ? state.draw.shift() : state.discard.pop();
    }

    /**
     * Play the top card of `from` ('draw' | 'discard') onto `to`
     * ('discard' | field index). Mutates state.
     * Returns { ok:true, id, to, completed?, completedCards?, won? }
     *       | { ok:false, reason, mistake?, id? }
     *   reason: 'over' | 'empty' | 'same' | 'invalid' | 'mismatch' | 'active'
     */
    function play(state, game, from, to) {
      if (state.status !== 'playing') return { ok: false, reason: 'over' };
      if (from !== 'draw' && from !== 'discard') return { ok: false, reason: 'invalid' };
      var id = topCard(state, from);
      if (id === null) return { ok: false, reason: 'empty' };
      if (to === 'discard') {
        if (from === 'discard') return { ok: false, reason: 'same' };
        state.discard.push(takeFrom(state, from));
        state.moves++;
        return { ok: true, id: id, to: 'discard' };
      }
      if (!isInt(to) || to < 0 || to >= FIELDS) return { ok: false, reason: 'invalid' };
      var reason = placeReject(state, game, id, to);
      if (reason) {
        state.mistakes++;
        return { ok: false, reason: reason, mistake: true, id: id };
      }
      takeFrom(state, from);
      state.fields[to].push(id);
      state.moves++;
      var res = { ok: true, id: id, to: to };
      if (state.fields[to].length >= CARDS_PER_CATEGORY) {
        res.completed = game.cards[id].cat;
        res.completedCards = state.fields[to].slice();
        state.done.push(res.completed);
        state.fields[to] = [];
        if (state.done.length >= game.cats.length) {
          state.status = 'won';
          res.won = true;
        }
      }
      return res;
    }

    /** Turn the discard pile over into the empty draw pile (first discarded = new top). */
    function canFlip(state) {
      return state.status === 'playing' && state.draw.length === 0 && state.discard.length > 0;
    }

    function flip(state) {
      if (!canFlip(state)) return false;
      state.draw = state.discard;
      state.discard = [];
      return true;
    }

    /** 0-1 mistakes: 3 stars, 2-4: 2 stars, 5+: 1 star. */
    function stars(mistakes) {
      if (mistakes <= 1) return 3;
      if (mistakes <= 4) return 2;
      return 1;
    }

    function starString(n) {
      return '★★★'.slice(0, n) + '☆☆☆'.slice(0, 3 - n);
    }

    function defaultStats() {
      return { played: 0, streak: 0, best: 0, lastWonDay: null, lastPlayedDay: null, stars: [0, 0, 0] };
    }

    function normalizeStats(s) {
      var d = defaultStats();
      if (!s || typeof s !== 'object') return d;
      ['played', 'streak', 'best', 'lastWonDay', 'lastPlayedDay'].forEach(function (k) {
        if (typeof s[k] === 'number' && isFinite(s[k])) d[k] = s[k];
      });
      if (Array.isArray(s.stars) && s.stars.length === 3) {
        d.stars = s.stars.map(function (v) { return typeof v === 'number' && isFinite(v) ? v : 0; });
      }
      return d;
    }

    /** Record a solved game. Idempotent per day. Returns new stats object. */
    function updateStats(stats, day, mistakes) {
      var s = normalizeStats(stats);
      if (s.lastPlayedDay === day) return s;
      s.played += 1;
      s.lastPlayedDay = day;
      s.streak = s.lastWonDay === day - 1 ? s.streak + 1 : 1;
      s.best = Math.max(s.best, s.streak);
      s.lastWonDay = day;
      s.stars[stars(mistakes) - 1] += 1;
      return s;
    }

    /** Streak as of `today`: broken if neither today nor yesterday was solved. */
    function currentStreak(stats, today) {
      var s = normalizeStats(stats);
      if (s.lastWonDay === null) return 0;
      return s.lastWonDay === today || s.lastWonDay === today - 1 ? s.streak : 0;
    }

    function shareText(puzzleNo, mistakes, streak) {
      return [
        "Riddle Me Rika #" + puzzleNo,
        starString(stars(mistakes)),
        mistakes + (mistakes === 1 ? ' mistake' : ' mistakes'),
        'Streak: ' + streak
      ].join('\n');
    }

    return {
      CONFIG: {
        FIELDS: FIELDS, CATEGORIES_PER_GAME: CATEGORIES_PER_GAME,
        CARDS_PER_CATEGORY: CARDS_PER_CATEGORY, MAX_TIER: MAX_TIER,
        SYMBOL_DIR: SYMBOL_DIR, SYMBOL_EXT: SYMBOL_EXT
      },
      dayNumber: dayNumber,
      dateForDay: dateForDay,
      msUntilMidnight: msUntilMidnight,
      formatCountdown: formatCountdown,
      mulberry32: mulberry32,
      seedForDay: seedForDay,
      shuffleWith: shuffleWith,
      eligibleCategories: eligibleCategories,
      buildGame: buildGame,
      newGame: newGame,
      restoreState: restoreState,
      topCard: topCard,
      fieldCat: fieldCat,
      placeReject: placeReject,
      play: play,
      canFlip: canFlip,
      flip: flip,
      stars: stars,
      starString: starString,
      defaultStats: defaultStats,
      normalizeStats: normalizeStats,
      updateStats: updateStats,
      currentStreak: currentStreak,
      shareText: shareText
    };
  })();

  if (typeof module === 'object' && module.exports) module.exports = Core;
  root.RikaCore = Core;
  if (typeof document === 'undefined') return;

  /* =======================================================================
     2. UI
     ======================================================================= */

  var KEY_STATS = 'rr:stats';
  var KEY_HELP = 'rr:seenHelp';
  var KEY_GAME_PREFIX = 'rr:game:';
  var DRAG_THRESHOLD = 7;
  var REVEAL_MS = 900;     // theme name shown on a completed field
  var FLY_MS = 420;        // cards flying to the Done pile
  var FEEDBACK_MS = 480;   // red / green field flash

  /* ---------- storage (never throws) ---------- */
  var store = {
    get: function (k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { root.localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
    remove: function (k) { try { root.localStorage.removeItem(k); } catch (e) { /* ignore */ } },
    keys: function () {
      try {
        var out = [];
        for (var i = 0; i < root.localStorage.length; i++) out.push(root.localStorage.key(i));
        return out;
      } catch (e) { return []; }
    },
    getJSON: function (k) {
      var raw = this.get(k);
      if (!raw) return null;
      try { return JSON.parse(raw); } catch (e) { return null; }
    }
  };

  /* ---------- tiny DOM helper ---------- */
  function h(tag, props) {
    var el = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        var v = props[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else el.setAttribute(k, v === true ? '' : String(v));
      });
    }
    for (var i = 2; i < arguments.length; i++) {
      var kids = [].concat(arguments[i]);
      kids.forEach(function (c) {
        if (c === null || c === undefined || c === false) return;
        el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return el;
  }

  function lenClass(word) {
    var n = word.length;
    if (n <= 7) return 's';
    if (n <= 9) return 'm';
    if (n <= 12) return 'l';
    return 'xl';
  }

  function reducedMotion() {
    try { return root.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  /* ---------- app state ---------- */
  var els = {};
  var game, state, day, realDay, puzzleNo, isOverride;
  var ui = {
    sel: 'draw',        // which playable card is selected: 'draw' | 'discard'
    busy: false,        // true during the completion animation
    reveal: null,       // {field, cards, cat} while a completed field shows its theme
    lastPlaced: null,   // card id that just landed in a field
    donePop: false,
    lastFocus: null
  };
  var ptr = null;       // active pointer interaction
  var toastTimer = 0;
  var failedSymbols = {}; // symbol -> true once its image failed to load

  function gameKey(d) { return KEY_GAME_PREFIX + d; }
  function save() { store.set(gameKey(day), JSON.stringify(state)); }
  function loadStats() { return Core.normalizeStats(store.getJSON(KEY_STATS)); }
  function streakNow() { return Core.currentStreak(loadStats(), realDay); }

  /** The card a tap on a field would play. */
  function selSource() {
    if (ui.sel === 'discard' && state.discard.length) return 'discard';
    if (state.draw.length) return 'draw';
    if (state.discard.length) return 'discard';
    return null;
  }

  /* ---------- boot ---------- */
  function start() {
    els.board = document.getElementById('board');
    els.draw = document.getElementById('pile-draw');
    els.discard = document.getElementById('pile-discard');
    els.done = document.getElementById('pile-done');
    els.drawLabel = document.getElementById('label-draw');
    els.discardLabel = document.getElementById('label-discard');
    els.doneLabel = document.getElementById('label-done');
    els.fields = document.getElementById('fields');
    els.mistakes = document.getElementById('mistakes');
    els.sub = document.getElementById('sub');
    els.toast = document.getElementById('toast');

    bindModals();

    var params;
    try { params = new URLSearchParams(root.location.search); } catch (e) { params = null; }
    realDay = Core.dayNumber(new Date());
    var dayParam = params && params.get('day');
    isOverride = dayParam !== null && dayParam !== undefined && /^-?\d+$/.test(dayParam);
    day = isOverride ? parseInt(dayParam, 10) : realDay;
    puzzleNo = day + 1;

    var date = Core.dateForDay(day);
    els.sub.textContent = '#' + puzzleNo + ' · ' +
      date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    game = Core.buildGame(root.CATEGORIES, day);
    if (!game) {
      showFatal(Array.isArray(root.CATEGORIES) ? 'Not enough categories for a game.' : 'No categories found.');
      return;
    }

    if (params && params.get('reset') === '1') {
      store.remove(gameKey(day));
      try {
        params.delete('reset');
        var qs = params.toString();
        root.history.replaceState(null, '', root.location.pathname + (qs ? '?' + qs : '') + root.location.hash);
      } catch (e) { /* ignore */ }
    }

    // drop saved games of other days (keep today and the viewed day)
    store.keys().forEach(function (k) {
      if (k && k.indexOf(KEY_GAME_PREFIX) === 0 && k !== gameKey(day) && k !== gameKey(realDay)) store.remove(k);
    });

    state = Core.restoreState(store.getJSON(gameKey(day)), game, day) || Core.newGame(game, day);
    if (state.status === 'won') recordResult();
    save();

    bindBoard();
    render();

    if (!store.get(KEY_HELP)) {
      store.set(KEY_HELP, '1');
      openModal('help-modal');
    }

    setInterval(tick, 1000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) tick(); });
  }

  function showFatal(msg) {
    els.fields.replaceChildren(h('p', { class: 'fatal', text: msg }));
  }

  function tick() {
    if (!isOverride && Core.dayNumber(new Date()) !== realDay) {
      root.location.reload();
      return;
    }
    updateTimer();
  }

  /* ---------- card elements ---------- */
  function placeholderEl(c) {
    return h('span', { class: 'card__placeholder', 'aria-hidden': 'true', text: c.word.charAt(0).toUpperCase() });
  }

  function artEl(c) {
    var art = h('span', { class: 'card__art', 'aria-hidden': 'true' });
    if (!c.symbol || failedSymbols[c.symbol]) {
      art.appendChild(placeholderEl(c));
      return art;
    }
    var img = h('img', {
      class: 'card__symbol', alt: '', draggable: 'false',
      src: SYMBOL_DIR + encodeURIComponent(c.symbol) + '.' + SYMBOL_EXT
    });
    img.addEventListener('error', function () {
      failedSymbols[c.symbol] = true;
      if (img.parentNode) img.parentNode.replaceChild(placeholderEl(c), img);
    });
    art.appendChild(img);
    return art;
  }

  /** A face-up card. tag 'button' for playable cards. */
  function cardEl(c, tag, attrs) {
    var a = attrs || {};
    var props = { class: 'card' + (a.cls ? ' ' + a.cls : ''), 'data-card': c.id };
    Object.keys(a).forEach(function (k) { if (k !== 'cls') props[k] = a[k]; });
    if (tag === 'button') props.type = 'button';
    return h(tag, props,
      h('span', { class: 'card__word', 'data-len': lenClass(c.word), text: c.word }),
      artEl(c));
  }

  /* ---------- rendering ---------- */
  function render() {
    var a = document.activeElement;
    var focusSel = null;
    if (a && els.board.contains(a)) {
      if (a.dataset.drag) focusSel = '[data-drag="' + a.dataset.drag + '"]';
      else if (a.dataset.action) focusSel = '[data-action="' + a.dataset.action + '"]';
      else if (a.dataset.drop) focusSel = '[data-drop="' + a.dataset.drop + '"]';
    }

    els.mistakes.textContent = String(state.mistakes);
    var sel = selSource();
    renderDraw(sel);
    renderDiscard(sel);
    renderDone();
    renderFields();
    els.board.classList.toggle('is-finished', state.status !== 'playing');

    ui.lastPlaced = null;
    ui.donePop = false;

    if (focusSel) {
      var n = els.board.querySelector(focusSel);
      if (n && n.tabIndex >= 0) { try { n.focus({ preventScroll: true }); } catch (e) { n.focus(); } }
    }
  }

  function underCards(n, cls) {
    var out = [];
    for (var k = Math.min(2, n - 1); k >= 1; k--) {
      out.push(h('div', { class: 'card ' + cls, style: '--i:' + k, 'aria-hidden': 'true' }));
    }
    return out;
  }

  function renderDraw(sel) {
    var n = state.draw.length;
    var kids;
    if (n) {
      var c = game.cards[state.draw[0]];
      kids = underCards(n, 'card--back').concat(cardEl(c, 'button', {
        cls: 'is-top' + (sel === 'draw' ? ' is-selected' : ''),
        'data-drag': 'draw',
        'aria-pressed': sel === 'draw' ? 'true' : 'false',
        'aria-label': 'Draw pile: ' + c.word + (sel === 'draw' ? ' (selected, tap again to discard)' : '')
      }));
    } else if (Core.canFlip(state)) {
      kids = [h('button', { type: 'button', class: 'pile__flip', 'data-action': 'flip', 'aria-label': 'Flip discard pile into draw pile' },
        h('span', { class: 'pile__flip-icon', 'aria-hidden': 'true', text: '↻' }),
        h('span', { class: 'pile__flip-text', text: 'Flip discard' }))];
    } else {
      kids = [h('div', { class: 'card card--empty', 'aria-hidden': 'true' })];
    }
    els.draw.replaceChildren.apply(els.draw, kids);
    els.drawLabel.textContent = 'Draw · ' + n;
  }

  function renderDiscard(sel) {
    var n = state.discard.length;
    var kids;
    if (n) {
      var c = game.cards[state.discard[n - 1]];
      kids = underCards(n, 'card--under').concat(cardEl(c, 'button', {
        cls: 'is-top' + (sel === 'discard' ? ' is-selected' : ''),
        'data-drag': 'discard',
        'aria-pressed': sel === 'discard' ? 'true' : 'false',
        'aria-label': 'Discard pile: ' + c.word + (sel === 'discard' ? ' (selected)' : '')
      }));
    } else {
      kids = [h('div', { class: 'card card--empty', 'aria-hidden': 'true' },
        state.status === 'playing' ? h('span', { class: 'card__hint', text: 'Park here' }) : null)];
    }
    els.discard.replaceChildren.apply(els.discard, kids);
    els.discard.setAttribute('aria-label', 'Discard pile, ' + n + (n === 1 ? ' card' : ' cards'));
    els.discardLabel.textContent = 'Discard · ' + n;
  }

  function renderDone() {
    // while a completed field is revealing, its cards have not "arrived" yet
    var done = ui.reveal ? state.done.slice(0, -1) : state.done;
    var k = done.length;
    var total = game.cats.length;
    var kids;
    if (k) {
      var cat = game.cats[done[k - 1]];
      kids = underCards(k, 'card--done-under').concat(h('div', {
        class: 'card card--done tier-' + cat.tier + (ui.donePop ? ' is-pop' : '')
      },
        h('span', { class: 'done__theme', text: cat.theme }),
        h('span', { class: 'done__count', text: k + '/' + total })));
    } else {
      kids = [h('div', { class: 'card card--empty' },
        h('span', { class: 'card__hint', text: '0/' + total }))];
    }
    els.done.replaceChildren.apply(els.done, kids);
    els.done.setAttribute('aria-label', 'Done pile, ' + k + ' of ' + total + ' categories. Show completed categories');
    els.doneLabel.textContent = 'Done · ' + k + '/' + total;
  }

  function renderFields() {
    if (state.status === 'won' && !ui.reveal) {
      els.fields.classList.add('is-result');
      els.fields.replaceChildren(resultPanel());
      updateTimer();
      return;
    }
    els.fields.classList.remove('is-result');
    var nodes = [];
    for (var f = 0; f < state.fields.length; f++) {
      var reveal = ui.reveal && ui.reveal.field === f ? ui.reveal : null;
      var ids = reveal ? reveal.cards : state.fields[f];
      var cardsEls = ids.map(function (id, i) {
        return cardEl(game.cards[id], 'div', {
          cls: 'card--field' + (ui.lastPlaced === id ? ' is-new' : ''),
          style: '--i:' + i, 'aria-hidden': 'true'
        });
      });
      var words = ids.map(function (id) { return game.cards[id].word; }).join(', ');
      var kids = cardsEls;
      if (reveal) {
        var cat = game.cats[reveal.cat];
        kids = kids.concat(h('div', { class: 'field__reveal tier-' + cat.tier },
          h('span', { class: 'field__theme', text: cat.theme })));
      } else if (!ids.length) {
        kids = [h('span', { class: 'field__hint', text: 'Empty' })];
      }
      nodes.push(h('div', {
        class: 'field' + (ids.length ? '' : ' is-empty') + (reveal ? ' is-complete' : ''),
        'data-drop': String(f), role: 'button', tabindex: '0',
        'aria-label': 'Field ' + (f + 1) + (ids.length ? ', ' + ids.length + ' of ' + Core.CONFIG.CARDS_PER_CATEGORY + ': ' + words : ', empty')
      }, kids));
    }
    els.fields.replaceChildren.apply(els.fields, nodes);
  }

  function resultPanel() {
    var m = state.mistakes;
    var shareBtn = h('button', { type: 'button', class: 'btn btn--primary result__share' }, 'Share');
    shareBtn.addEventListener('click', share);
    return h('section', { class: 'result', 'aria-live': 'polite' },
      h('h2', { class: 'result__title', text: 'Solved!' }),
      h('p', { class: 'result__stars', 'aria-label': Core.stars(m) + ' of 3 stars', text: Core.starString(Core.stars(m)) }),
      h('p', { class: 'result__meta', text: m + (m === 1 ? ' mistake' : ' mistakes') + ' · Streak ' + streakNow() }),
      shareBtn,
      h('p', { class: 'result__next' }, 'Next puzzle in ', h('span', { class: 'result__timer', id: 'timer', text: '--:--:--' }))
    );
  }

  function updateTimer() {
    var t = document.getElementById('timer');
    if (t) t.textContent = Core.formatCountdown(Core.msUntilMidnight(new Date()));
  }

  function flash(el, cls, ms) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth; // restart animation
    el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, ms || FEEDBACK_MS);
  }

  function dropEl(dest) { return els.board.querySelector('[data-drop="' + dest + '"]'); }

  function toast(msg, ms) {
    clearTimeout(toastTimer);
    els.toast.textContent = msg;
    els.toast.classList.add('is-visible');
    toastTimer = setTimeout(function () { els.toast.classList.remove('is-visible'); }, ms || 1400);
  }

  /* ---------- actions ---------- */
  /**
   * Play the top card of `from` onto `to`. `drag` (optional) is the finished
   * pointer interaction whose ghost should land or snap back.
   */
  function doPlay(from, to, drag) {
    var res = Core.play(state, game, from, to);
    if (!res.ok) {
      if (res.mistake) save();
      render();
      if (drag) snapBack(drag);
      else if (res.mistake) flash(els.board.querySelector('[data-drag="' + from + '"]'), 'is-bounce');
      if (res.mistake) {
        flash(dropEl(to), 'is-wrong');
        flash(els.mistakes.parentNode, 'is-bump');
        toast('Doesn’t fit');
      }
      return;
    }
    if (drag) removeGhost(drag);
    ui.sel = 'draw';
    save();
    if (res.completed !== undefined) {
      ui.lastPlaced = res.id;
      runCompletion(to, res);
      return;
    }
    if (to !== 'discard') ui.lastPlaced = res.id;
    render();
    if (to !== 'discard') flash(dropEl(to), 'is-correct');
  }

  function doFlip() {
    if (!Core.flip(state)) return;
    ui.sel = 'draw';
    save();
    render();
  }

  function runCompletion(f, res) {
    ui.busy = true;
    els.board.classList.add('is-busy');
    ui.reveal = { field: f, cards: res.completedCards, cat: res.completed };
    render();
    flash(dropEl(f), 'is-correct');
    var quick = reducedMotion();
    setTimeout(function () {
      var flyMs = quick ? 0 : flyToDone(f);
      setTimeout(function () {
        ui.reveal = null;
        ui.busy = false;
        ui.donePop = !quick;
        els.board.classList.remove('is-busy');
        if (res.won) recordResult();
        render();
        if (res.won) toast('Solved!');
      }, flyMs);
    }, quick ? 500 : REVEAL_MS);
  }

  /** Animate the cards of field f onto the Done pile. Returns duration in ms. */
  function flyToDone(f) {
    var field = dropEl(f);
    if (!field) return 0;
    var target = els.done.getBoundingClientRect();
    var cardsEls = field.querySelectorAll('.card');
    var clones = [];
    cardsEls.forEach(function (el, i) {
      var r = el.getBoundingClientRect();
      var g = el.cloneNode(true);
      g.classList.add('card-flying');
      g.classList.remove('is-new');
      var st = g.style;
      st.position = 'fixed';
      st.left = r.left + 'px';
      st.top = r.top + 'px';
      st.width = r.width + 'px';
      st.height = r.height + 'px';
      st.margin = '0';
      st.zIndex = String(900 + i);
      st.pointerEvents = 'none';
      document.body.appendChild(g);
      clones.push({ g: g, dx: target.left - r.left, dy: target.top - r.top, s: target.width / r.width, i: i });
      el.style.visibility = 'hidden';
    });
    var label = field.querySelector('.field__reveal');
    if (label) label.classList.add('is-leaving');
    void document.body.offsetWidth;
    clones.forEach(function (c) {
      c.g.style.transition = 'transform ' + FLY_MS + 'ms cubic-bezier(.5,0,.3,1) ' + (c.i * 50) + 'ms, opacity ' + FLY_MS + 'ms ease ' + (c.i * 50) + 'ms';
      c.g.style.transformOrigin = '0 0';
      c.g.style.transform = 'translate(' + c.dx + 'px,' + c.dy + 'px) scale(' + c.s + ')';
    });
    var total = FLY_MS + clones.length * 50;
    setTimeout(function () {
      clones.forEach(function (c) { if (c.g.parentNode) c.g.parentNode.removeChild(c.g); });
    }, total + 20);
    return total;
  }

  function recordResult() {
    if (state.recorded) return;
    state.recorded = true;
    if (!isOverride) {
      store.set(KEY_STATS, JSON.stringify(Core.updateStats(loadStats(), day, state.mistakes)));
    }
    save();
  }

  /** A tap (or Enter/Space) on a playable card, a pile, a field or a button. */
  function tap(t) {
    var action = t.dataset.action;
    if (action === 'done') { openModal('done-modal'); return; }
    if (ui.busy || state.status !== 'playing') return;
    if (action === 'flip') { doFlip(); return; }

    var sel = selSource();
    var drag = t.dataset.drag;
    if (drag === 'draw') {
      if (sel === 'draw') doPlay('draw', 'discard'); // tap the selected draw card again = park it
      else { ui.sel = 'draw'; render(); }
      return;
    }
    if (drag === 'discard') {
      ui.sel = sel === 'discard' ? 'draw' : 'discard';
      render();
      return;
    }
    var dest = t.dataset.drop;
    if (dest === 'discard') {
      if (sel === 'draw') doPlay('draw', 'discard');
      return;
    }
    if (dest === undefined || sel === null) return;
    doPlay(sel, +dest);
  }

  /* ---------- pointer: unified tap + drag ---------- */
  function bindBoard() {
    els.board.addEventListener('pointerdown', onDown);
    root.addEventListener('pointermove', onMove, { passive: false });
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointercancel', onCancel);
    root.addEventListener('blur', onCancel);
    // stop iOS from scrolling / zooming the play area
    els.board.addEventListener('touchmove', function (e) { if (e.cancelable) e.preventDefault(); }, { passive: false });
    els.board.addEventListener('dblclick', function (e) { e.preventDefault(); });
    els.board.addEventListener('contextmenu', function (e) {
      if (e.target.closest('[data-drag],[data-drop],[data-action]')) e.preventDefault();
    });
    els.board.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var t = e.target.closest('[data-drag],[data-drop],[data-action]');
      if (!t || !els.board.contains(t) || t !== e.target) return;
      e.preventDefault();
      tap(t);
    });
  }

  function onDown(e) {
    if (ptr || e.isPrimary === false) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    var t = e.target.closest('[data-drag],[data-drop],[data-action]');
    if (!t || !els.board.contains(t)) return;
    if (!state) return;
    if (t.closest('.result')) return; // let the share button work normally
    e.preventDefault(); // no text selection / focus steal / emulated mouse events
    var dragEl = e.target.closest('[data-drag]');
    ptr = {
      id: e.pointerId, x0: e.clientX, y0: e.clientY,
      target: t, dragEl: dragEl && els.board.contains(dragEl) && !ui.busy && state.status === 'playing' ? dragEl : null,
      dragging: false, ghost: null, over: null
    };
  }

  function onMove(e) {
    if (!ptr || e.pointerId !== ptr.id) return;
    if (!ptr.dragging) {
      if (!ptr.dragEl) return;
      var dx = e.clientX - ptr.x0, dy = e.clientY - ptr.y0;
      if (dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return;
      startDrag();
    }
    if (e.cancelable) e.preventDefault();
    ptr.ghost.style.left = (e.clientX - ptr.offX) + 'px';
    ptr.ghost.style.top = (e.clientY - ptr.offY) + 'px';
    setOver(dropAt(e.clientX, e.clientY));
  }

  function startDrag() {
    var el = ptr.dragEl;
    var r = el.getBoundingClientRect();
    var ghost = el.cloneNode(true);
    ['data-drag', 'data-card', 'aria-label', 'aria-pressed'].forEach(function (a) { ghost.removeAttribute(a); });
    ghost.classList.remove('is-selected', 'is-new', 'is-drag-source', 'is-bounce');
    ghost.classList.add('card-ghost');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.tabIndex = -1;
    var st = ghost.style;
    st.position = 'fixed';
    st.left = r.left + 'px';
    st.top = r.top + 'px';
    st.width = r.width + 'px';
    st.height = r.height + 'px';
    st.margin = '0';
    st.pointerEvents = 'none';
    st.zIndex = '1000';
    document.body.appendChild(ghost);

    ptr.offX = ptr.x0 - r.left;
    ptr.offY = ptr.y0 - r.top;
    ptr.srcRect = r;
    ptr.ghost = ghost;
    ptr.dragging = true;
    ptr.src = el.dataset.drag; // 'draw' | 'discard'
    el.classList.add('is-drag-source');
    document.body.classList.add('is-dragging');
  }

  function dropAt(x, y) {
    var hit = document.elementFromPoint(x, y);
    var t = hit && hit.closest('[data-drop]');
    return t && els.board.contains(t) ? t : null;
  }

  function setOver(t) {
    if (t === ptr.over) return;
    if (ptr.over) ptr.over.classList.remove('is-drop-target');
    if (t) t.classList.add('is-drop-target');
    ptr.over = t;
  }

  /** Ends the pointer interaction; the ghost (if any) stays until removeGhost/snapBack. */
  function endPointer() {
    var p = ptr;
    ptr = null;
    if (!p) return null;
    if (p.over) p.over.classList.remove('is-drop-target');
    if (p.dragEl) p.dragEl.classList.remove('is-drag-source');
    document.body.classList.remove('is-dragging');
    return p;
  }

  function removeGhost(p) {
    if (p && p.ghost && p.ghost.parentNode) p.ghost.parentNode.removeChild(p.ghost);
  }

  /** Fly the ghost back to where the drag started, hiding the real card meanwhile. */
  function snapBack(p) {
    if (!p.ghost) return;
    var src = els.board.querySelector('[data-drag="' + p.src + '"]');
    if (reducedMotion() || !p.srcRect) { removeGhost(p); return; }
    if (src) src.classList.add('is-drag-source');
    var g = p.ghost;
    g.classList.add('is-returning');
    g.style.transition = 'left 220ms cubic-bezier(.3,1.4,.5,1), top 220ms cubic-bezier(.3,1.4,.5,1), transform 220ms ease';
    void g.offsetWidth;
    g.style.left = p.srcRect.left + 'px';
    g.style.top = p.srcRect.top + 'px';
    setTimeout(function () {
      removeGhost(p);
      if (src) src.classList.remove('is-drag-source');
    }, 240);
  }

  function onUp(e) {
    if (!ptr || e.pointerId !== ptr.id) return;
    var p = endPointer();
    if (p.dragging) {
      var t = dropAt(e.clientX, e.clientY);
      handleDrop(p, t ? t.dataset.drop : null);
      return;
    }
    // tap: only if released over the same element it started on
    var hit = document.elementFromPoint(e.clientX, e.clientY);
    var under = hit && hit.closest('[data-drag],[data-drop],[data-action]');
    if (under === p.target) tap(p.target);
  }

  function onCancel(e) {
    if (!ptr) return;
    if (e && e.type === 'pointercancel' && e.pointerId !== ptr.id) return;
    var p = endPointer();
    if (p && p.dragging) snapBack(p);
  }

  function handleDrop(p, dest) {
    if (state.status !== 'playing' || ui.busy || dest === null || dest === undefined) { snapBack(p); return; }
    if (dest === 'discard') {
      if (p.src === 'draw') doPlay('draw', 'discard', p);
      else snapBack(p);
      return;
    }
    doPlay(p.src, +dest, p);
  }

  /* ---------- share ---------- */
  function share() {
    var text = Core.shareText(puzzleNo, state.mistakes, streakNow());
    var coarse = false;
    try { coarse = root.matchMedia('(pointer: coarse)').matches; } catch (e) { /* ignore */ }
    if (navigator.share && coarse) {
      navigator.share({ text: text }).catch(function (err) {
        if (err && err.name === 'AbortError') return;
        copy(text);
      });
      return;
    }
    copy(text);
  }

  function copy(text) {
    function fallback() {
      var ok = false;
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '0';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, text.length);
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch (e) { ok = false; }
      toast(ok ? 'Copied' : 'Could not copy');
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { toast('Copied'); }, fallback);
        return;
      }
    } catch (e) { /* fall through */ }
    fallback();
  }

  /* ---------- modals ---------- */
  function bindModals() {
    document.getElementById('help-btn').addEventListener('click', function () { openModal('help-modal'); });
    document.getElementById('stats-btn').addEventListener('click', function () { openModal('stats-modal'); });
    document.querySelectorAll('.modal').forEach(function (m) {
      m.addEventListener('click', function (e) {
        if (e.target === m || e.target.closest('[data-close]')) closeModal(m);
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var open = document.querySelector('.modal:not([hidden])');
      if (open) closeModal(open);
    });
  }

  function openModal(id) {
    var m = document.getElementById(id);
    if (!m) return;
    if (id === 'stats-modal') renderStats();
    if (id === 'done-modal') renderDoneList();
    ui.lastFocus = document.activeElement;
    m.hidden = false;
    var c = m.querySelector('[data-close]');
    if (c) { try { c.focus({ preventScroll: true }); } catch (e) { c.focus(); } }
  }

  function closeModal(m) {
    m.hidden = true;
    if (ui.lastFocus && ui.lastFocus.focus && document.contains(ui.lastFocus)) ui.lastFocus.focus();
    ui.lastFocus = null;
  }

  function renderDoneList() {
    var list = document.getElementById('done-list');
    if (!state || !state.done.length) {
      list.replaceChildren(h('li', { class: 'done-list__empty', text: 'No categories completed yet.' }));
      return;
    }
    list.replaceChildren.apply(list, state.done.map(function (ci) {
      var cat = game.cats[ci];
      var words = game.cards.filter(function (c) { return c.cat === ci; }).map(function (c) { return c.word; });
      return h('li', { class: 'done-list__item tier-' + cat.tier },
        h('strong', { class: 'done-list__theme', text: cat.theme }),
        h('span', { class: 'done-list__words', text: words.join(' · ') }));
    }));
  }

  function renderStats() {
    var s = loadStats();
    var items = [
      [s.played, 'Solved'],
      [Core.currentStreak(s, realDay), 'Current streak'],
      [s.best, 'Best streak'],
      [s.stars[2], '★★★ games']
    ];
    var grid = document.getElementById('stats-grid');
    grid.replaceChildren.apply(grid, items.map(function (it) {
      return h('div', { class: 'stat' },
        h('span', { class: 'stat__num', text: String(it[0]) }),
        h('span', { class: 'stat__label', text: it[1] }));
    }));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
