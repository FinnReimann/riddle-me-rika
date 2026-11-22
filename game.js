/* =========================================================================
   Riddle Me Rika - game logic
   -------------------------------------------------------------------------
   Two parts:
   1. Core  - pure functions (no DOM, no storage). Exported for node tests
              via module.exports and exposed in the browser as window.RikaCore.
   2. UI    - DOM rendering, pointer/touch handling, persistence, modals.
              Only runs when a `document` exists.
   Categories come from window.CATEGORIES (categories.js), all texts from
   window.RIKA_I18N (i18n.js, loaded before this file).
   ========================================================================= */
(function (root) {
  'use strict';

  /* ---- CONFIG ---------------------------------------------------------- */
  var CATEGORIES_PER_GAME = 10; // categories in one daily game (each has 1 category card)
  var MIN_CARDS_PER_CATEGORY = 4; // word cards per category: each day every category gets a
  var MAX_CARDS_PER_CATEGORY = 7; // seeded random number N in this range (shown on its category card)
  var TOP_FIELDS = 4;           // fields in the upper row, start empty
  var BOTTOM_FIELDS = 4;        // fields in the lower row, start with face-down cards
  var FACE_DOWN_PER_FIELD = 6;  // face-down cards per bottom field (4 x 6 = 24; the other ~30-50 cards are the draw pile)
  var MIN_CATEGORY_CARDS_IN_DRAW = Math.ceil(CATEGORIES_PER_GAME / 2); // category cards dealt into the draw pile
  // Move budget per day = round(cards x MOVES_PER_CARD) + MOVES_BASE (cards = categories + all N),
  // calibrated with the built-in solver over 2000 daily deals (see README "Config").
  var MOVES_PER_CARD = 1;       // budget per card of the day (every play costs 1 move, also a wrong one)
  var MOVES_BASE = 35;          // + this many (typical day: ~65 cards = ~100 moves)
  var STAR3_EXTRA = 18;         // ★★★: finished in at most (cards + this) moves
  var STAR2_EXTRA = 28;         // ★★☆: at most (cards + this) moves (more = ★☆☆)
  var TUCK_COST = 2;            // "tuck under": a pile's face-up run goes under its face-down cards
  var DEAL_SPARE = 10;          // a deal is only used if the solver finishes it with this many moves to spare
  var DEAL_ATTEMPTS = 200;      // reshuffles tried per day before giving up
  var DEAL_HELP = 0.75;         // chance that a turned card is picked among the immediately usable ones (see dealOrder)
  var MAX_TIER = 1;             // only categories with tier <= MAX_TIER are used
  var SYMBOL_DIR = 'assets/symbols/';            // the owner's drawings: <symbol>.png (always win)
  var SYMBOL_EXT = 'png';
  var SYMBOL_GEN_DIR = 'assets/symbols/generated/'; // generated fallback: <symbol>.png (rendered from the .svg sources)
  var SYMBOL_GEN_EXT = 'png';
  var CATEGORY_SYMBOL_PREFIX = 'category-';     // category card symbol = category-<categoryId>
  var FIELDS = TOP_FIELDS + BOTTOM_FIELDS;

  /* =======================================================================
     1. CORE
     ======================================================================= */
  var Core = (function () {
    var SAVE_VERSION = 12;
    var STATS_VERSION = 3;
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

    /** Optional text field (e.g. wordDe): string, or '' if missing. */
    function optText(v) { return (typeof v === 'string' || typeof v === 'number') ? String(v) : ''; }

    function validCard(cd) {
      return cd && (typeof cd.word === 'string' || typeof cd.word === 'number') && String(cd.word).length > 0;
    }

    /** Categories usable today, sorted by id so file order does not matter. */
    function eligibleCategories(list) {
      if (!Array.isArray(list)) return [];
      return list.filter(function (c) {
        return c && typeof c.id === 'string' && typeof c.theme === 'string' &&
          tierOf(c) <= MAX_TIER && Array.isArray(c.cards) &&
          c.cards.filter(validCard).length >= MIN_CARDS_PER_CATEGORY;
      }).sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; });
    }

    /**
     * Move budget and star thresholds for a day with `total` cards:
     * { moves, star3Left, star2Left } (star thresholds = moves left needed).
     */
    function budgetFor(total) {
      var moves = Math.round(total * MOVES_PER_CARD) + MOVES_BASE;
      return { moves: moves, star3Left: moves - total - STAR3_EXTRA, star2Left: moves - total - STAR2_EXTRA };
    }

    /**
     * The daily game: same for everyone on a given day.
     * Returns { cats:[{id,theme,themeDe,tier,n}], cards:[card], order:[ids], sig, moves, ... } or null.
     * card = { id, kind:'cat'|'word', cat, word, wordDe, symbol }.
     *   Category cards: word/wordDe = theme/themeDe, symbol = category-<categoryId>.
     * order = the shuffled deal: the first BOTTOM_FIELDS * FACE_DOWN_PER_FIELD
     * cards go face down onto the bottom fields, the rest is the draw pile.
     * attempt = how many reshuffles were needed to get a solvable deal (0 = none).
     * sig only uses English texts, so a save survives a language switch.
     * moves / star3Left / star2Left = the day's move budget and star thresholds (budgetFor).
     * cats[i].n = number of word cards of category i today.
     * opts (optional, for calibration): { maxMoves, help } replace the solver's limit
     * (moves - DEAL_SPARE) / DEAL_HELP.
     */
    function buildGame(list, day, opts) {
      var o = opts || {};
      var limit = 0; // set below, from the day's card count
      var help = typeof o.help === 'number' ? o.help : DEAL_HELP;
      var pool = eligibleCategories(list);
      if (pool.length < CATEGORIES_PER_GAME) return null;
      var rng = mulberry32(seedForDay(day));
      var picked = shuffleWith(pool, rng).slice(0, CATEGORIES_PER_GAME);
      var cats = [], cards = [];
      picked.forEach(function (c, ci) {
        // N word cards for this category today (clamped to the pool, see eligibleCategories)
        var pool2 = c.cards.filter(validCard);
        var n = Math.min(pool2.length, MIN_CARDS_PER_CATEGORY + Math.floor(rng() * (MAX_CARDS_PER_CATEGORY - MIN_CARDS_PER_CATEGORY + 1)));
        cats.push({ id: c.id, theme: c.theme, themeDe: optText(c.themeDe), tier: tierOf(c), n: n });
        cards.push({ id: cards.length, kind: 'cat', cat: ci, word: c.theme, wordDe: optText(c.themeDe),
          symbol: CATEGORY_SYMBOL_PREFIX + c.id });
        shuffleWith(pool2, rng).slice(0, n).forEach(function (cd) {
          cards.push({ id: cards.length, kind: 'word', cat: ci, word: String(cd.word), wordDe: optText(cd.wordDe),
            symbol: cd.symbol ? String(cd.symbol) : '' });
        });
      });
      var game = { cats: cats, cards: cards, order: null, attempt: 0 };
      var b = budgetFor(cards.length);
      game.moves = b.moves; game.star3Left = b.star3Left; game.star2Left = b.star2Left;
      limit = o.maxMoves || game.moves - DEAL_SPARE;
      // Many shuffles cannot be finished (bottom cards cannot be discarded, so
      // a word card can block its own category card). Deal (see dealOrder) and
      // let the solver check it; if that fails, deal again with a seed derived
      // from the day - the same result for everyone.
      for (;;) {
        game.order = dealOrder(game, rng, limit, help);
        if (game.order && solve(game, limit).won) break;
        game.attempt += 1;
        if (game.attempt > DEAL_ATTEMPTS) throw new Error('No solvable deal for day ' + day);
        rng = mulberry32((seedForDay(day) + Math.imul(game.attempt, 0x9E3779B9)) >>> 0);
      }
      game.sig = cats.map(function (c) { return c.id; }).join(',') + '|' +
        cards.map(function (c) { return c.word; }).join(',') + '|' + game.order.join(',');
      return game;
    }

    /**
     * Fresh state. fields[f] = { c:[card ids, bottom first], d:face-down count, p:pile? }
     *   p = true while a bottom field still holds cards. Its face-down cards are
     *   always the lowest d cards; the face-up cards above them (c.slice(d)) are
     *   its RUN: one card, several word cards of the same category, or a
     *   category card with word cards of its category on it (a stack on the
     *   pile: completes there like on a field). The run is played as one unit
     *   (a run with its category card only onto a free field); word cards of
     *   its category can be added on top.
     *   Once empty it becomes p = false, a free field like the top ones.
     */
    function newGame(game, day, practice) {
      var fields = [], k = 0;
      for (var f = 0; f < FIELDS; f++) {
        if (f < TOP_FIELDS) { fields.push({ c: [], d: 0, p: false }); continue; }
        var c = game.order.slice(k, k + FACE_DOWN_PER_FIELD);
        k += c.length;
        fields.push({ c: c, d: c.length, p: c.length > 0 });
      }
      return {
        v: SAVE_VERSION,
        day: day,
        sig: game.sig,
        draw: game.order.slice(k),  // draw[0] is the top card
        discard: [],                // last element is the top card
        fields: fields,
        done: [],                   // completed category indices, in order
        movesLeft: game.moves,
        moves: 0,                   // moves spent
        wrong: 0,                   // wrong placements (part of moves)
        status: 'playing',          // 'playing' | 'won' | 'lost'
        recorded: false,            // stats already updated?
        practice: !!practice,       // a restart after the day was already finished: not counted
        ratings: { perfect: 0, good: 0, detour: 0 } // move ratings of this round (rateMove)
      };
    }

    function isInt(n) { return typeof n === 'number' && isFinite(n) && Math.floor(n) === n; }

    /** Validate a saved state against today's game. Returns state or null. */
    function restoreState(obj, game, day) {
      try {
        if (!obj || obj.v !== SAVE_VERSION || obj.day !== day || obj.sig !== game.sig) return null;
        if (!Array.isArray(obj.draw) || !Array.isArray(obj.discard) || !Array.isArray(obj.done)) return null;
        if (!Array.isArray(obj.fields) || obj.fields.length !== FIELDS) return null;
        if (!isInt(obj.movesLeft) || obj.movesLeft < 0 || obj.movesLeft > game.moves) return null;
        if (!isInt(obj.moves) || obj.moves < 0 || !isInt(obj.wrong) || obj.wrong < 0) return null;
        if (['playing', 'won', 'lost'].indexOf(obj.status) < 0) return null;
        if (obj.practice !== undefined && typeof obj.practice !== 'boolean') return null;
        if (obj.ratings !== undefined) {
          if (!obj.ratings || typeof obj.ratings !== 'object') return null;
          if (!['perfect', 'good', 'detour'].every(function (k) { return isInt(obj.ratings[k]) && obj.ratings[k] >= 0; })) return null;
        }
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
          var fl = obj.fields[f];
          if (!fl || !Array.isArray(fl.c) || !isInt(fl.d) || typeof fl.p !== 'boolean') return null;
          var ids = fl.c;
          for (var j = 0; j < ids.length; j++) if (!take(ids[j])) return null;
          if (fl.p) {
            if (f < TOP_FIELDS || !ids.length || fl.d < 0 || fl.d > ids.length) return null; // (a tuck can put more than FACE_DOWN_PER_FIELD cards face down)
            var run = ids.slice(fl.d);
            if (run.length > MAX_CARDS_PER_CATEGORY) return null;
            if (run.length > 1) {
              // words of one category, or that category's card at the base + its words (not complete)
              var rcat = game.cards[run[0]].cat;
              for (var r = 0; r < run.length; r++) {
                var rc = game.cards[run[r]];
                if (rc.cat !== rcat || (rc.kind === 'cat' && r > 0)) return null;
              }
              if (game.cards[run[0]].kind === 'cat' && run.length > game.cats[rcat].n) return null;
              if (game.cards[run[0]].kind === 'cat' && fieldCats[rcat]) return null;
              if (game.cards[run[0]].kind === 'cat') fieldCats[rcat] = true;
            }
          } else {
            if (fl.d !== 0) return null;
            if (ids.length) {
              // a stack: category card + its words (a full stack is done, not on a field)
              var base = game.cards[ids[0]];
              if (base.kind !== 'cat' || doneSeen[base.cat] || fieldCats[base.cat] || ids.length > game.cats[base.cat].n) return null;
              fieldCats[base.cat] = true;
              for (var w = 1; w < ids.length; w++) {
                var wc = game.cards[ids[w]];
                if (wc.kind !== 'word' || wc.cat !== base.cat) return null;
              }
            }
          }
        }
        if (Object.keys(seen).length !== nCards) return null;
        var allDone = obj.done.length === game.cats.length;
        if ((obj.status === 'won') !== allDone) return null;
        if (obj.status === 'lost' && obj.movesLeft !== 0) return null;
        if (obj.status === 'playing' && obj.movesLeft === 0) return null;
        return obj;
      } catch (e) {
        return null;
      }
    }

    function validFrom(from) {
      return from === 'draw' || from === 'discard' || (isInt(from) && from >= 0 && from < FIELDS);
    }

    /** Playable card id at `from` ('draw' | 'discard' | field index), or null. */
    function topCard(state, from, game) {
      if (from === 'draw') return state.draw.length ? state.draw[0] : null;
      if (from === 'discard') return state.discard.length ? state.discard[state.discard.length - 1] : null;
      if (!isInt(from)) return null;
      var fl = state.fields[from];
      if (fl && fl.p && fl.c.length && fl.d < fl.c.length) return fl.c[fl.c.length - 1];
      if (isLone(state, from, game)) return fl.c[0];
      return null;
    }

    /**
     * Does field f hold a category card alone (no word cards on it yet)?
     * Such a card may be taken back onto the Discard pile (1 move), nowhere else.
     */
    function isLone(state, f, game) {
      var fl = isInt(f) ? state.fields[f] : null;
      return !!fl && !fl.p && fl.c.length === 1 && !!game && game.cards[fl.c[0]].kind === 'cat';
    }

    /** All places with a playable card / unit right now. */
    function playableSources(state, game) {
      var out = [];
      if (state.draw.length) out.push('draw');
      if (state.discard.length) out.push('discard');
      for (var f = 0; f < FIELDS; f++) if (topCard(state, f, game) !== null) out.push(f);
      return out;
    }

    /** Can the top card of bottom pile f be turned face up? */
    function canTurn(state, f) {
      var fl = isInt(f) ? state.fields[f] : null;
      return state.status === 'playing' && !!fl && fl.p && fl.c.length > 0 && fl.d === fl.c.length;
    }

    /** Turn the top face-down card of pile f face up. Free (no move). */
    function turn(state, f) {
      if (!canTurn(state, f)) return false;
      state.fields[f].d -= 1;
      return true;
    }

    /** Is field f a free field (empty: accepts a category card)? */
    function isFree(state, f) {
      var fl = state.fields[f];
      return !!fl && !fl.p && fl.c.length === 0;
    }

    /** Category index of the stack on field f, or null (empty / pile). */
    function fieldCat(state, game, f) {
      var fl = state.fields[f];
      return fl && !fl.p && fl.c.length ? game.cards[fl.c[0]].cat : null;
    }

    /** Face-up run of bottom pile f (card ids, bottom first); [] if none. */
    function runOf(state, f) {
      var fl = isInt(f) ? state.fields[f] : null;
      return fl && fl.p ? fl.c.slice(fl.d) : [];
    }

    /**
     * The cards a play from `from` moves: the whole run of a bottom pile, a
     * lone category card on a field, else the top card.
     */
    function unitOf(state, from, game) {
      if (isInt(from)) {
        return isLone(state, from, game) ? state.fields[from].c.slice() : runOf(state, from);
      }
      var id = topCard(state, from, game);
      return id === null ? [] : [id];
    }

    /**
     * Why card `id` (or a run starting with it) may not go on field f:
     *   null (fits) | 'locked' (a bottom pile whose top card is face down, no move)
     *   | 'needCategory' (word card / run onto an empty field) | 'occupied' (category
     *   card onto a stack or run - a category card is always the lowest card)
     *   | 'mismatch' (word card of another category).
     */
    function placeReject(state, game, id, f) {
      var fl = state.fields[f];
      var card = game.cards[id];
      if (fl.p) {
        if (fl.d >= fl.c.length) return 'locked';
        if (card.kind === 'cat') return 'occupied';
        // a run of word cards, or a face-up category card (with its words) acting as a stack base
        var top = game.cards[fl.c[fl.c.length - 1]];
        return top.cat === card.cat ? null : 'mismatch';
      }
      if (!fl.c.length) return card.kind === 'cat' ? null : 'needCategory';
      if (card.kind === 'cat') return 'occupied';
      return game.cards[fl.c[0]].cat === card.cat ? null : 'mismatch';
    }

    /** Remove the unit at `from` (see unitOf). */
    function takeFrom(state, from) {
      if (from === 'draw') return [state.draw.shift()];
      if (from === 'discard') return [state.discard.pop()];
      var fl = state.fields[from];
      var ids = fl.c.splice(fl.d); // a run, or a lone category card (d = 0)
      if (!fl.c.length) { fl.p = false; fl.d = 0; } // emptied bottom field = free field
      return ids;
    }

    function spend(state, res) {
      state.movesLeft -= 1;
      state.moves += 1;
      res.cost = true;
      if (state.status === 'playing' && state.movesLeft <= 0) {
        state.movesLeft = 0;
        state.status = 'lost';
        res.lost = true;
      }
      return res;
    }

    /**
     * Play the card at `from` ('draw' | 'discard' | field index) onto `to`
     * ('discard' | field index). From a bottom pile the whole face-up run moves
     * (one move). Only the draw card may go onto Discard - and a category card
     * that lies alone on its field (taken back, 1 move). Mutates state.
     * Every successful play costs 1 move; a wrong one is free (it bounces back).
     * Returns { ok:true, id, ids, to, cost, completed?, completedCards?, won?, lost? }
     *       | { ok:false, reason, cost?, mistake?, id?, ids?, lost? }
     *   id = the lowest card of the moved unit, ids = all of its cards.
     *   reason (no cost): 'over' | 'invalid' | 'empty' | 'same' | 'locked' | 'drawOnly'
     *     | 'fixed' (a lone category card may only go back to Discard)
     *   reason (wrong move, mistake: true, free): 'needCategory' | 'occupied' | 'mismatch'
     */
    function play(state, game, from, to) {
      if (state.status !== 'playing') return { ok: false, reason: 'over' };
      if (!validFrom(from)) return { ok: false, reason: 'invalid' };
      var unit = unitOf(state, from, game);
      if (!unit.length) return { ok: false, reason: 'empty' };
      var id = unit[0];
      if (to === 'discard') {
        if (from === 'discard') return { ok: false, reason: 'same' };
        // only the draw card, or a lone category card taken back
        if (from !== 'draw' && !isLone(state, from, game)) return { ok: false, reason: 'drawOnly', id: id, ids: unit };
        takeFrom(state, from);
        state.discard.push(id);
        return spend(state, { ok: true, id: id, ids: unit, to: 'discard' });
      }
      if (!isInt(to) || to < 0 || to >= FIELDS) return { ok: false, reason: 'invalid' };
      if (to === from) return { ok: false, reason: 'same' };
      if (isLone(state, from, game)) return { ok: false, reason: 'fixed', id: id, ids: unit }; // only back to Discard
      var reason = placeReject(state, game, id, to);
      if (reason === 'locked') return { ok: false, reason: reason };
      if (reason) {
        state.wrong += 1; // counted, but free: the card just bounces back
        return { ok: false, reason: reason, mistake: true, id: id, ids: unit };
      }
      takeFrom(state, from);
      var target = state.fields[to];
      var stack = target.c;
      for (var u = 0; u < unit.length; u++) stack.push(unit[u]);
      var res = { ok: true, id: id, ids: unit, to: to };
      // the stack: a field's cards, or the face-up run of a bottom pile (when its base is the category card)
      var base = target.p ? target.d : 0;
      var baseCard = game.cards[stack[base]];
      if (baseCard.kind === 'cat' && stack.length - base >= 1 + game.cats[baseCard.cat].n) {
        res.completed = baseCard.cat;
        res.completedCards = stack.slice(base);
        res.fromPile = target.p;
        state.done.push(res.completed);
        stack.splice(base);
        if (!stack.length) { target.p = false; target.d = 0; }
        if (state.done.length >= game.cats.length) {
          state.status = 'won';
          res.won = true;
        }
      }
      return spend(state, res);
    }

    /* ---- Move ratings -----------------------------------------------------
       A quick judgement of a play, shown after every successful card play:
       'perfect' (one of the best moves), 'good' (useful, but a better one was
       there) or 'detour' (weak). Pure: looks at the state BEFORE the play. */

    /** Is a word card of category ci face up somewhere playable (draw / discard top, a pile's face-up cards)? */
    function wordsVisible(state, game, ci) {
      var ids = [];
      if (state.draw.length) ids.push(state.draw[0]);
      if (state.discard.length) ids.push(state.discard[state.discard.length - 1]);
      for (var f = 0; f < FIELDS; f++) if (state.fields[f].p) ids = ids.concat(runOf(state, f));
      return ids.some(function (id) { var c = game.cards[id]; return c.kind === 'word' && c.cat === ci; });
    }

    function freeCount(state) {
      var n = 0;
      for (var f = 0; f < FIELDS; f++) if (isFree(state, f)) n++;
      return n;
    }

    /** Rating of a LEGAL play [from, to] onto a field, ignoring the "elsewhere" rules. */
    function placementRating(state, game, from, to) {
      var unit = unitOf(state, from, game), first = game.cards[unit[0]], fl = state.fields[to];
      if (first.kind === 'word') {
        // onto its category stack (field, or a category card on a pile) = perfect; onto a word run = good
        if (!fl.p) return 'perfect';
        return game.cards[fl.c[fl.d]].kind === 'cat' ? 'perfect' : 'good';
      }
      if (unit.length > 1) return 'good'; // a pile's category stack onto a free field (uncovers cards)
      return wordsVisible(state, game, first.cat) ? 'perfect' : 'good';
    }

    /** Every legal play onto a field right now, as [from, to]. */
    function legalPlacements(state, game) {
      var out = [], srcs = playableSources(state, game);
      for (var i = 0; i < srcs.length; i++) {
        var from = srcs[i];
        if (isLone(state, from, game)) continue; // only goes back to Discard
        var unit = unitOf(state, from, game);
        if (!unit.length) continue;
        for (var to = 0; to < FIELDS; to++) {
          if (to === from) continue;
          if (placeReject(state, game, unit[0], to) === null) out.push([from, to]);
        }
      }
      return out;
    }

    /** Is a 'perfect' play available (optionally not from source `except`)? */
    function perfectAvailable(state, game, except) {
      return legalPlacements(state, game).some(function (m) {
        return m[0] !== except && placementRating(state, game, m[0], m[1]) === 'perfect';
      });
    }

    /**
     * Rate the play move = [from, to] in `state` (before it is made):
     * 'perfect' | 'good' | 'detour'.
     *   perfect: completes a category or puts word cards onto their category
     *            stack (field or pile category card); a category card onto a
     *            free field while one of its words is visible.
     *   good:    builds a run on a bottom pile; moves a pile's category stack
     *            to a free field; a category card with none of its words
     *            visible; discarding the draw card when nothing perfect was there.
     *   detour:  discarding the draw card / taking back a lone category card
     *            while a perfect move was there; a category card onto the LAST
     *            free field while a perfect move was there elsewhere.
     * null for a play that would be refused (wrong moves get no rating).
     */
    function rateMove(state, game, move) {
      var from = move[0], to = move[1];
      var unit0 = unitOf(state, from, game);
      if (!unit0.length || to === from) return null;
      if (to === 'discard') {
        if (from !== 'draw' && !isLone(state, from, game)) return null; // refused anyway
        return perfectAvailable(state, game) ? 'detour' : 'good';
      }
      if (!isInt(to) || to < 0 || to >= FIELDS || isLone(state, from, game) ||
          placeReject(state, game, unit0[0], to) !== null) return null; // not a legal play: no rating
      var r = placementRating(state, game, from, to);
      var unit = unitOf(state, from, game);
      if (game.cards[unit[0]].kind === 'cat' && !state.fields[to].p && freeCount(state) === 1 &&
          perfectAvailable(state, game, from)) return 'detour';
      return r;
    }

    /* ---- Tuck under + lock detection ---------------------------------------
       "Locked" = no useful move: nothing to turn, no legal play onto a field,
       no lone category card to take back, and no card in the draw / discard
       pile fits anywhere (cycling them won't help). The escape: TUCK UNDER -
       a bottom pile's face-up run slides under that pile's face-down cards
       (TUCK_COST moves), so the next card can be turned. */

    /** Can the face-up run of bottom pile f be tucked under its face-down cards? */
    function canTuck(state, f) {
      var fl = isInt(f) ? state.fields[f] : null;
      return state.status === 'playing' && !!fl && fl.p && fl.d > 0 && fl.d < fl.c.length;
    }

    /** Tuck the run of pile f under (costs TUCK_COST). Returns { ok, ids, cost, lost? } or { ok:false }. */
    function tuck(state, game, f) {
      if (!canTuck(state, f)) return { ok: false, reason: 'invalid' };
      var fl = state.fields[f];
      var run = fl.c.splice(fl.d);
      fl.c = run.concat(fl.c);
      fl.d = fl.c.length;
      var res = { ok: true, ids: run, cost: true };
      state.moves += TUCK_COST;
      state.movesLeft -= TUCK_COST;
      if (state.movesLeft <= 0) { state.movesLeft = 0; state.status = 'lost'; res.lost = true; }
      return res;
    }

    /** { locked, canTuck } for the current state (see above). */
    function lockInfo(state, game) {
      var out = { locked: false, canTuck: false };
      if (state.status !== 'playing') return out;
      var f;
      for (f = 0; f < FIELDS; f++) if (canTuck(state, f)) out.canTuck = true;
      for (f = 0; f < FIELDS; f++) if (canTurn(state, f) || isLone(state, f, game)) return out;
      if (legalPlacements(state, game).length) return out;
      var pile = state.draw.concat(state.discard);
      for (var i = 0; i < pile.length; i++) {
        for (f = 0; f < FIELDS; f++) if (placeReject(state, game, pile[i], f) === null) return out;
      }
      out.locked = true;
      return out;
    }

    /** Rating of a tuck: 'good' when nothing useful was left (locked), else 'detour'. */
    function rateTuck(state, game) {
      return lockInfo(state, game).locked ? 'good' : 'detour';
    }

    /** Count a rating in the state (for the result tally and share text). */
    function addRating(state, kind) {
      if (!state.ratings) state.ratings = { perfect: 0, good: 0, detour: 0 };
      if (state.ratings[kind] !== undefined) state.ratings[kind] += 1;
    }

    /** Turn the discard pile over into the empty draw pile (first discarded = new top). Free. */
    function canFlip(state) {
      return state.status === 'playing' && state.draw.length === 0 && state.discard.length > 0;
    }

    function flip(state) {
      if (!canFlip(state)) return false;
      state.draw = state.discard;
      state.discard = [];
      return true;
    }

    /* ---- Solver ----------------------------------------------------------
       A greedy player that plays like a careful person: it only looks at
       face-up cards and the draw / discard pile, NEVER at face-down cards.
       buildGame uses it to deal only games it can finish within
       the day's budget minus DEAL_SPARE; the budget and stars were calibrated with it.
       Because it never peeks, the deal can be made "lazily" (dealOrder):
       a face-down card gets its identity only when the player turns it,
       and replaying the player on the finished deal gives the same game. */

    /** Next play [from, to] for the solver, or null (then: discard / flip). */
    function solverPick(s, game, relaxed) {
      var cards = game.cards, f, i, j, c;
      var stackOf = {}, free = [], runs = [];
      for (f = 0; f < FIELDS; f++) {
        var fl = s.fields[f];
        if (fl.p) {
          if (fl.d < fl.c.length) {
            runs.push(f);
            // a face-up category card on a pile is a stack base too
            var b = cards[fl.c[fl.d]];
            if (b.kind === 'cat' && stackOf[b.cat] === undefined) stackOf[b.cat] = f;
          }
          continue;
        }
        if (!fl.c.length) free.push(f);
        else stackOf[cards[fl.c[0]].cat] = f;
      }
      // dig where most cards are still face down
      runs.sort(function (a, b) { return s.fields[b].d - s.fields[a].d || a - b; });
      var srcs = runs.concat(s.discard.length ? ['discard'] : [], s.draw.length ? ['draw'] : []);
      var targets = runs; // runs that take word cards of their category
      function first(src) { return cards[unitOf(s, src, game)[0]]; }
      function runTop(f2) { var fl2 = s.fields[f2]; return cards[fl2.c[fl2.c.length - 1]]; }
      // 1. a card / run onto its category stack
      for (i = 0; i < srcs.length; i++) {
        c = first(srcs[i]);
        if (c.kind === 'word' && stackOf[c.cat] !== undefined) return [srcs[i], stackOf[c.cat]];
      }
      // 2. a pile's run onto another run of the same category (uncovers a card)
      for (i = 0; i < runs.length; i++) {
        c = first(runs[i]);
        if (c.kind !== 'word') continue;
        for (j = 0; j < targets.length; j++) {
          var tj = targets[j], tt = runTop(tj);
          if (tj !== runs[i] && tt.kind === 'word' && tt.cat === c.cat) {
            if (s.fields[tj].p && s.fields[tj].d > s.fields[runs[i]].d) return [tj, runs[i]];
            return [runs[i], tj];
          }
        }
      }
      // 3. a category card onto a free field; keep one field free unless stuck
      if (free.length && (relaxed || free.length > 1)) {
        var best = null, bestScore = -1;
        for (i = 0; i < srcs.length; i++) {
          c = first(srcs[i]);
          if (c.kind !== 'cat') continue;
          // uncovering pays; so do visible words of this category
          var score = isInt(srcs[i]) ? 10 : 0;
          for (j = 0; j < targets.length; j++) {
            var rt = runTop(targets[j]);
            if (rt.kind === 'word' && rt.cat === c.cat) score += 3 * (s.fields[targets[j]].c.length - s.fields[targets[j]].d);
          }
          for (j = 0; j < s.discard.length; j++) if (cards[s.discard[j]].cat === c.cat) score += 1;
          for (j = 0; j < s.draw.length; j++) if (cards[s.draw[j]].cat === c.cat) score += 1;
          if (score > bestScore) { best = srcs[i]; bestScore = score; }
        }
        if (best !== null) return [best, free[0]];
      }
      // 4. discard / draw card onto a run of its category (the run moves as one later)
      var piles = ['discard', 'draw'];
      for (i = 0; i < piles.length; i++) {
        if (srcs.indexOf(piles[i]) < 0) continue;
        c = first(piles[i]);
        if (c.kind !== 'word') continue;
        for (j = 0; j < targets.length; j++) {
          var t2 = runTop(targets[j]);
          if (t2.kind === 'word' && t2.cat === c.cat) return [piles[i], targets[j]];
        }
      }
      return null;
    }

    /**
     * Let the solver play state `s` to the end (mutates it). onTurn(s, f) is
     * called right before a face-down card of field f is turned.
     * Returns { won, moves }.
     */
    function solverPlay(s, game, onTurn) {
      var progress = true, relaxed = false, guard = 0, f;
      while (s.status === 'playing' && guard++ < 3000) {
        for (f = TOP_FIELDS; f < FIELDS; f++) {
          if (!canTurn(s, f)) continue;
          if (onTurn) onTurn(s, f);
          turn(s, f);
        }
        var p = solverPick(s, game, relaxed);
        if (p) { play(s, game, p[0], p[1]); progress = true; relaxed = false; continue; }
        if (s.draw.length) { play(s, game, 'draw', 'discard'); continue; }
        if (s.discard.length && progress) { progress = false; flip(s); continue; }
        if (!relaxed) { relaxed = true; continue; } // stuck: may use the last free field
        break;
      }
      return { won: s.status === 'won', moves: s.moves };
    }

    /** Can the solver finish `game` within `limit` moves? Returns { won, moves }. */
    function solve(game, limit) {
      var s = newGame(game, 0);
      s.movesLeft = limit;
      return solverPlay(s, game);
    }

    /**
     * One deal attempt, deterministic for a given rng. Returns the order
     * (bottom fields, each from its lowest card up, then the draw pile from
     * its top) or null if this attempt does not work out.
     * 1. Shuffle. While fewer than MIN_CATEGORY_CARDS_IN_DRAW category cards
     *    are in the draw pile, a random bottom category card swaps places
     *    with a random draw word card. The draw pile is now fixed.
     * 2. The bottom cards are dealt lazily: the solver plays, and whenever it
     *    turns a face-down card, that card is drawn at random from the bottom
     *    cards not dealt yet (with chance DEAL_HELP only from those it can use
     *    right away). If the solver gets stuck or runs out of moves: null.
     */
    function dealOrder(game, rng, limit, help) {
      var cards = game.cards;
      var order = shuffleWith(cards.map(function (c) { return c.id; }), rng);
      var nDown = BOTTOM_FIELDS * FACE_DOWN_PER_FIELD;
      function positions(from, to, kind) {
        var out = [];
        for (var i = from; i < to; i++) if (cards[order[i]].kind === kind) out.push(i);
        return out;
      }
      var need = Math.min(MIN_CATEGORY_CARDS_IN_DRAW, order.length - nDown);
      while (positions(nDown, order.length, 'cat').length < need) {
        var down = positions(0, nDown, 'cat'), up = positions(nDown, order.length, 'word');
        if (!down.length || !up.length) break;
        var a = down[Math.floor(rng() * down.length)], b = up[Math.floor(rng() * up.length)];
        var tmp = order[a]; order[a] = order[b]; order[b] = tmp;
      }
      var pool = order.slice(0, nDown), draw = order.slice(nDown);
      var fields = [], dealt = [];
      for (var f = 0; f < FIELDS; f++) {
        var n = f < TOP_FIELDS ? 0 : FACE_DOWN_PER_FIELD, slots = [];
        for (var k = 0; k < n; k++) slots.push(-1);
        fields.push({ c: slots.slice(), d: n, p: n > 0 });
        dealt.push(slots);
      }
      var s = { v: SAVE_VERSION, day: 0, sig: '', draw: draw.slice(), discard: [], fields: fields, done: [],
        movesLeft: limit, moves: 0, wrong: 0, status: 'playing', recorded: false };
      function useful(id) {
        var c = cards[id];
        for (var g = 0; g < FIELDS; g++) {
          var fl = s.fields[g];
          if (c.kind === 'cat') { if (!fl.p && !fl.c.length) return true; continue; }
          if (!fl.p && fl.c.length && cards[fl.c[0]].cat === c.cat) return true; // its stack
          if (fl.p && fl.d < fl.c.length) {
            var top = cards[fl.c[fl.c.length - 1]];
            if (top.cat === c.cat) return true; // a run or a category card on the pile
          }
        }
        return false;
      }
      var r = solverPlay(s, game, function (st, g) {
        var cand = pool;
        if (rng() < help) {
          var u = pool.filter(useful);
          if (u.length) cand = u;
        }
        var id = cand[Math.floor(rng() * cand.length)];
        pool.splice(pool.indexOf(id), 1);
        var fl = st.fields[g];
        fl.c[fl.d - 1] = id;
        dealt[g][fl.d - 1] = id;
      });
      if (!r.won) return null;
      var out = [];
      for (f = TOP_FIELDS; f < FIELDS; f++) out = out.concat(dealt[f]);
      return out.concat(draw);
    }

    /**
     * Stars by moves left: >= game.star3Left 3, >= game.star2Left 2, else 1.
     * Without a game: the thresholds of the smallest day (all categories with
     * MIN_CARDS_PER_CATEGORY).
     */
    function stars(movesLeft, game) {
      var b = game || budgetFor(CATEGORIES_PER_GAME * (1 + MIN_CARDS_PER_CATEGORY));
      if (movesLeft >= b.star3Left) return 3;
      if (movesLeft >= b.star2Left) return 2;
      return 1;
    }

    function starString(n) {
      return '★★★'.slice(0, n) + '☆☆☆'.slice(0, 3 - n);
    }

    function defaultStats() {
      return { v: STATS_VERSION, played: 0, solved: 0, streak: 0, best: 0,
        lastWonDay: null, lastPlayedDay: null, stars: [0, 0, 0] };
    }

    /** Stats in the current shape; older versions are reset. */
    function normalizeStats(s) {
      var d = defaultStats();
      if (!s || typeof s !== 'object' || s.v !== STATS_VERSION) return d;
      ['played', 'solved', 'streak', 'best', 'lastWonDay', 'lastPlayedDay'].forEach(function (k) {
        if (typeof s[k] === 'number' && isFinite(s[k])) d[k] = s[k];
      });
      if (Array.isArray(s.stars) && s.stars.length === 3) {
        d.stars = s.stars.map(function (v) { return typeof v === 'number' && isFinite(v) ? v : 0; });
      }
      return d;
    }

    /**
     * Record a finished game (won or lost). Idempotent per day. game = the
     * day's game (for its star thresholds).
     * A loss breaks the streak. Returns a new stats object.
     */
    function updateStats(stats, day, won, movesLeft, game) {
      var s = normalizeStats(stats);
      if (s.lastPlayedDay === day) return s;
      s.played += 1;
      s.lastPlayedDay = day;
      if (won) {
        s.solved += 1;
        s.streak = s.lastWonDay === day - 1 ? s.streak + 1 : 1;
        s.best = Math.max(s.best, s.streak);
        s.lastWonDay = day;
        s.stars[stars(movesLeft, game) - 1] += 1;
      } else {
        s.streak = 0;
      }
      return s;
    }

    /** Streak as of `today`: broken if neither today nor yesterday was solved. */
    function currentStreak(stats, today) {
      var s = normalizeStats(stats);
      if (s.lastWonDay === null) return 0;
      return s.lastWonDay === today || s.lastWonDay === today - 1 ? s.streak : 0;
    }

    var SHARE_EN = {
      movesLeftOne: '{n} move left',
      movesLeftOther: '{n} moves left',
      shareLost: 'Out of moves · {k}/{total}',
      shareStreak: 'Streak: {n}'
    };

    /**
     * Share text (no spoilers). r = { won, movesLeft, done, total, stars?, ratings? }.
     * ratings { perfect, good, detour } add a line "✨12 👍5 ↩︎2".
     * `tr` (optional) translates: tr(key, vars) with the i18n.js keys
     * movesLeftOne / movesLeftOther / shareLost / shareStreak. Default: English.
     */
    function shareText(puzzleNo, r, streak, tr) {
      var t = tr || function (key, v) {
        return SHARE_EN[key].replace(/\{(\w+)\}/g, function (m, k) { return String(v[k]); });
      };
      var lines = ['Riddle Me Rika #' + puzzleNo];
      if (r.won) {
        lines.push(starString(r.stars || stars(r.movesLeft)));
        lines.push(t(r.movesLeft === 1 ? 'movesLeftOne' : 'movesLeftOther', { n: r.movesLeft }));
      } else {
        lines.push(t('shareLost', { k: r.done, total: r.total }));
      }
      if (r.ratings) lines.push('✨' + r.ratings.perfect + ' 👍' + r.ratings.good + ' ↩︎' + r.ratings.detour);
      lines.push(t('shareStreak', { n: streak }));
      return lines.join('\n');
    }

    return {
      CONFIG: {
        FIELDS: FIELDS, TOP_FIELDS: TOP_FIELDS, BOTTOM_FIELDS: BOTTOM_FIELDS,
        FACE_DOWN_PER_FIELD: FACE_DOWN_PER_FIELD,
        MOVES_PER_CARD: MOVES_PER_CARD, MOVES_BASE: MOVES_BASE,
        STAR3_EXTRA: STAR3_EXTRA, STAR2_EXTRA: STAR2_EXTRA, DEAL_SPARE: DEAL_SPARE, TUCK_COST: TUCK_COST,
        CATEGORIES_PER_GAME: CATEGORIES_PER_GAME,
        MIN_CARDS_PER_CATEGORY: MIN_CARDS_PER_CATEGORY, MAX_CARDS_PER_CATEGORY: MAX_CARDS_PER_CATEGORY,
        MAX_TIER: MAX_TIER, SYMBOL_DIR: SYMBOL_DIR, SYMBOL_EXT: SYMBOL_EXT,
        SYMBOL_GEN_DIR: SYMBOL_GEN_DIR, SYMBOL_GEN_EXT: SYMBOL_GEN_EXT,
        CATEGORY_SYMBOL_PREFIX: CATEGORY_SYMBOL_PREFIX, SAVE_VERSION: SAVE_VERSION,
        MIN_CATEGORY_CARDS_IN_DRAW: MIN_CATEGORY_CARDS_IN_DRAW,
        DEAL_ATTEMPTS: DEAL_ATTEMPTS, DEAL_HELP: DEAL_HELP
      },
      dayNumber: dayNumber,
      dateForDay: dateForDay,
      msUntilMidnight: msUntilMidnight,
      formatCountdown: formatCountdown,
      mulberry32: mulberry32,
      seedForDay: seedForDay,
      shuffleWith: shuffleWith,
      eligibleCategories: eligibleCategories,
      dealOrder: dealOrder,
      buildGame: buildGame,
      budgetFor: budgetFor,
      newGame: newGame,
      restoreState: restoreState,
      topCard: topCard,
      runOf: runOf,
      isLone: isLone,
      unitOf: unitOf,
      playableSources: playableSources,
      canTurn: canTurn,
      turn: turn,
      isFree: isFree,
      fieldCat: fieldCat,
      placeReject: placeReject,
      play: play,
      canFlip: canFlip,
      flip: flip,
      rateMove: rateMove,
      canTuck: canTuck,
      tuck: tuck,
      lockInfo: lockInfo,
      rateTuck: rateTuck,
      addRating: addRating,
      solve: solve,
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
  var KEY_HELP = 'rr:seenHelp4'; // bumped when the rules change, so the how-to shows again
  var KEY_GAME_PREFIX = 'rr:game:';
  var DRAG_THRESHOLD = 7;
  var REVEAL_MS = 900;     // theme name shown on a completed field
  var FLY_MS = 420;        // cards flying to the Done pile
  var FEEDBACK_MS = 480;   // red / green field flash
  var LOST_DELAY_MS = 700; // let the last move show before the result panel
  var LOW_MOVES = 5;       // move counter turns red (and pulses) at or below this
  var PERFECT_STREAK_MIN = 2; // "Perfect ×2" from this many perfect plays in a row
  var FAN_MS = 170;        // completed cards fan up before flying to Done
  var FLY_STAGGER = 70;    // ms between the flying cards
  var FXo = root.RikaFX || null; // fx.js (particles, confetti, sounds); optional

  /** Call an fx.js effect if fx.js is loaded: fx('sparkle', x, y) / fx('sound.place', 3). */
  function fx(name) {
    if (!FXo) return;
    var args = Array.prototype.slice.call(arguments, 1);
    var parts = name.split('.'), obj = FXo, fn = FXo[parts[0]];
    if (parts.length === 2) { obj = FXo[parts[0]]; fn = obj && obj[parts[1]]; }
    if (typeof fn === 'function') { try { fn.apply(obj, args); } catch (e) { /* effects never break the game */ } }
  }

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

  /* ---------- language (texts in i18n.js) ---------- */
  var KEY_LANG = 'rr:lang';
  var LANGS = ['en', 'de'];
  var I18N = root.RIKA_I18N || {};
  var lang = initialLang();

  function initialLang() {
    var saved = store.get(KEY_LANG);
    if (LANGS.indexOf(saved) >= 0) return saved;
    var nav = '';
    try { nav = String(navigator.language || ''); } catch (e) { /* ignore */ }
    return nav.toLowerCase().indexOf('de') === 0 ? 'de' : 'en';
  }

  function otherLang() { return lang === 'de' ? 'en' : 'de'; }

  /** Translated text for `key`, {placeholders} filled from `vars`. Falls back to English, then the key. */
  function t(key, vars) {
    var tab = I18N[lang] || {};
    var s = tab[key];
    if (s === undefined) s = (I18N.en || {})[key];
    if (s === undefined) s = key;
    return String(s).replace(/\{(\w+)\}/g, function (m, k) {
      return vars && vars[k] !== undefined ? String(vars[k]) : m;
    });
  }

  /** Singular / plural: key + 'One' when n === 1, else key + 'Other'. */
  function tn(key, n, vars) {
    var v = vars || {};
    v.n = n;
    return t(key + (n === 1 ? 'One' : 'Other'), v);
  }

  var SHY = /­/g; // soft hyphen

  /** Card word / category name in the active language (English if no German text). */
  function wordOf(c) { return lang === 'de' && c.wordDe ? c.wordDe : c.word; }
  function themeOf(cat) { return lang === 'de' && cat.themeDe ? cat.themeDe : cat.theme; }
  /** Text for screen readers (no soft hyphens; category cards are announced as such). */
  function cardLabel(c) {
    var w = wordOf(c).replace(SHY, '');
    return c.kind === 'cat' ? t('ariaCategoryCard', { name: w, n: game.cats[c.cat].n }) : w;
  }

  /** Length class for a category name, from its longest word: s <=9, l 10-12, xl 13+. */
  function themeLen(theme) {
    var n = 0;
    theme.replace(SHY, '').split(/\s+/).forEach(function (w) { n = Math.max(n, w.length); });
    return n <= 9 ? 's' : n <= 12 ? 'l' : 'xl';
  }

  /** Word-length class for the card's top text: s <=7, m <=9, l <=11, xl <=13, xxl 14+. */
  function lenClass(word) {
    var n = word.replace(SHY, '').length; // soft hyphens don't count
    if (n <= 7) return 's';
    if (n <= 9) return 'm';
    if (n <= 11) return 'l';
    if (n <= 13) return 'xl';
    return 'xxl';
  }

  function reducedMotion() {
    try { return root.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  /* ---------- app state ---------- */
  var els = {};
  var game, state, day, realDay, puzzleNo, isOverride;
  var ui = {
    sel: 'draw',        // selected playable card: 'draw' | 'discard' | field index (run of a bottom pile)
    busy: false,        // true during the completion / end animation
    hold: false,        // keep showing the board (not the result) for a moment
    reveal: null,       // {field, cards, cat} while a completed field shows its theme
    lastPlaced: null,   // card ids that just landed in a field
    donePop: false,
    lastFocus: null,
    picked: false,      // the selection was tapped by the player (not the default / a just turned card)
    perfectRun: 0,      // perfect plays in a row (any other rating or a wrong move resets it)
    flipField: null,    // bottom field whose card was just turned (3D flip)
    gen: 0              // bumped on restart: pending animations of the old game stop
  };
  var ptr = null;       // active pointer interaction
  var toastTimer = 0;
  // symbol -> 0 = try PNG, 1 = try generated SVG, 2 = placeholder.
  // Only moves forward on a load error, so re-renders never re-request a failed file.
  var symbolStage = {};
  var fatalKey = null;    // i18n key of the error shown instead of the game

  function gameKey(d) { return KEY_GAME_PREFIX + d; }
  function save() { store.set(gameKey(day), JSON.stringify(state)); }
  function loadStats() { return Core.normalizeStats(store.getJSON(KEY_STATS)); }
  function streakNow() { return Core.currentStreak(loadStats(), realDay); }

  /** 'draw' | 'discard' | 'f3' <-> core source ('draw' | 'discard' | 3). */
  function srcKey(from) { return typeof from === 'number' ? 'f' + from : from; }
  function parseSrc(key) { return /^f\d+$/.test(key) ? parseInt(key.slice(1), 10) : key; }

  /** The card a tap on a field would play. */
  function selSource() {
    var s = ui.sel;
    if (typeof s === 'number' && Core.topCard(state, s, game) !== null) return s;
    if (s === 'discard' && state.discard.length) return 'discard';
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
    els.moves = document.getElementById('moves');
    els.sub = document.getElementById('sub');
    els.toast = document.getElementById('toast');
    els.langBtn = document.getElementById('lang-btn');
    els.langImg = els.langBtn.querySelector('.lang-btn__icon');
    els.langText = els.langBtn.querySelector('.lang-btn__text');

    bindModals();
    bindLang();

    var params;
    try { params = new URLSearchParams(root.location.search); } catch (e) { params = null; }
    realDay = Core.dayNumber(new Date());
    var dayParam = params && params.get('day');
    isOverride = dayParam !== null && dayParam !== undefined && /^-?\d+$/.test(dayParam);
    day = isOverride ? parseInt(dayParam, 10) : realDay;
    puzzleNo = day + 1;

    applyStatic();

    game = Core.buildGame(root.CATEGORIES, day);
    if (!game) {
      fatalKey = Array.isArray(root.CATEGORIES) ? 'errNotEnough' : 'errNoCategories';
      showFatal();
      return;
    }
    applyStatic(); // the how-to shows today's move budget

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

    // old saves (other version) fail restoreState and are replaced by a new game
    state = Core.restoreState(store.getJSON(gameKey(day)), game, day) || Core.newGame(game, day);
    if (state.status !== 'playing') recordResult();
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

  function showFatal() {
    els.fields.replaceChildren(h('p', { class: 'fatal', text: t(fatalKey) }));
  }

  /* ---------- language: static texts + toggle ---------- */
  /**
   * Texts that live in index.html: elements with data-i18n="key" get their
   * text, data-i18n-aria="key" their aria-label. Also the header subtitle,
   * <html lang> and the language button.
   */
  function applyStatic() {
    document.documentElement.lang = lang;
    var vars = { cats: Core.CONFIG.CATEGORIES_PER_GAME, moves: game ? game.moves : '' };
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'), vars);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'), vars));
    });
    if (puzzleNo !== undefined) {
      var date = Core.dateForDay(day);
      els.sub.textContent = t('sub', {
        no: puzzleNo,
        date: date.toLocaleDateString(t('dateLocale'), { month: 'short', day: 'numeric', year: 'numeric' })
      });
    }
    renderLangBtn();
  }

  /**
   * Language button: icon assets/icons/lang.png (set in index.html) plus a
   * small badge with the CURRENT language ("EN" / "DE"). If the icon is
   * missing, .lang-btn.no-icon shows only the text, larger.
   */
  function renderLangBtn() {
    els.langBtn.setAttribute('aria-label', t('langSwitch'));
    els.langText.textContent = t('langBadge');
  }

  function bindLang() {
    function noIcon() { els.langBtn.classList.add('no-icon'); }
    els.langImg.addEventListener('error', noIcon);
    // the image may already have failed before this script ran
    if (els.langImg.complete && !els.langImg.naturalWidth) noIcon();
    els.langBtn.addEventListener('click', function () { setLang(otherLang()); });
  }

  /** Switch language instantly, keeping the game as it is. */
  function setLang(l) {
    if (LANGS.indexOf(l) < 0 || l === lang) return;
    lang = l;
    store.set(KEY_LANG, l);
    applyStatic();
    if (!game) { if (fatalKey) showFatal(); return; }
    if (ptr) onCancel(); // a drag in progress snaps back
    // mid-animation the board re-renders by itself when done
    if (!ui.busy) render();
    renderStats();
    renderDoneList();
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
    return h('span', { class: 'card__placeholder', 'aria-hidden': 'true', text: wordOf(c).charAt(0).toUpperCase() });
  }

  function symbolUrl(sym, stage) {
    return stage === 0
      ? SYMBOL_DIR + encodeURIComponent(sym) + '.' + SYMBOL_EXT
      : SYMBOL_GEN_DIR + encodeURIComponent(sym) + '.' + SYMBOL_GEN_EXT;
  }

  /**
   * Symbol with a fallback chain: assets/symbols/<symbol>.png (the owner's
   * drawing) -> assets/symbols/generated/<symbol>.svg -> placeholder.
   */
  function artEl(c) {
    var art = h('span', { class: 'card__art', 'aria-hidden': 'true' });
    var sym = c.symbol;
    var stage = sym ? (symbolStage[sym] || 0) : 2;
    if (stage >= 2) {
      art.appendChild(placeholderEl(c));
      return art;
    }
    var img = h('img', { class: 'card__symbol', alt: '', draggable: 'false', src: symbolUrl(sym, stage) });
    img.addEventListener('error', function () {
      var cur = symbolStage[sym] || 0;
      if (cur === stage) symbolStage[sym] = cur + 1; // another <img> may have advanced it already
      stage = symbolStage[sym];
      if (stage < 2) img.src = symbolUrl(sym, stage);
      else if (img.parentNode) img.parentNode.replaceChild(placeholderEl(c), img);
    });
    art.appendChild(img);
    return art;
  }

  /** A face-up card (word or category card). tag 'button' for playable cards. */
  function cardEl(c, tag, attrs) {
    var a = attrs || {};
    var cls = 'card' + (c.kind === 'cat' ? ' card--category tier-' + game.cats[c.cat].tier : '') + (a.cls ? ' ' + a.cls : '') + (a.counter ? ' has-counter' : '');
    var props = { class: cls, 'data-card': c.id };
    Object.keys(a).forEach(function (k) { if (k !== 'cls' && k !== 'counter') props[k] = a[k]; });
    if (tag === 'button') props.type = 'button';
    var text = wordOf(c);
    var label = c.kind === 'cat'
      ? h('span', { class: 'card__catname', 'data-len': themeLen(text), text: text })
      : h('span', { class: 'card__word', 'data-len': lenClass(text), text: text });
    // "x/y" counter (top-left): words on the stack / today's N of this category.
    // Only on the topmost card of a stack (and on a category card lying on Draw / Discard).
    var counter = a.counter ? h('span', { class: 'card__counter', 'aria-hidden': 'true', text: a.counter }) : null;
    return h(tag, props, label, artEl(c), counter);
  }

  /* ---------- rendering ---------- */
  function render() {
    var a = document.activeElement;
    var fk = a && els.board.contains(a) ? a.getAttribute('data-fk') : null;

    els.moves.textContent = String(state.movesLeft);
    els.moves.parentNode.classList.toggle('is-low', state.movesLeft <= LOW_MOVES);
    var sel = state.status === 'playing' ? selSource() : null;
    var lock = Core.lockInfo(state, game);
    ui.locked = lock.locked;
    renderDraw(sel);
    renderDiscard(sel);
    renderDone();
    renderFields(sel);
    els.board.classList.toggle('is-finished', state.status !== 'playing');

    ui.lastPlaced = null;
    ui.donePop = false;
    ui.flipField = null;
    // nothing useful left: a gentle hint (once per position) to tuck under, or to restart
    if (lock.locked && !ui.busy && ui.lockHintAt !== state.moves) {
      ui.lockHintAt = state.moves;
      toast(t(lock.canTuck ? 'lockTuck' : 'lockRestart', { n: Core.CONFIG.TUCK_COST }), 5200, true);
    }

    if (fk) {
      var n = els.board.querySelector('[data-fk="' + fk + '"]');
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
        counter: c.kind === 'cat' ? '0/' + game.cats[c.cat].n : null,
        'data-drag': 'draw', 'data-fk': 'draw',
        'aria-pressed': sel === 'draw' ? 'true' : 'false',
        'aria-label': t(sel === 'draw' ? 'ariaDrawSelected' : 'ariaDraw', { word: cardLabel(c) })
      }));
    } else if (Core.canFlip(state)) {
      kids = [h('button', { type: 'button', class: 'pile__flip', 'data-action': 'flip', 'data-fk': 'flip', 'aria-label': t('ariaFlip') },
        h('span', { class: 'pile__flip-icon', 'aria-hidden': 'true', text: '↻' }),
        h('span', { class: 'pile__flip-text', text: t('flipDiscard') }))];
    } else {
      kids = [h('div', { class: 'card card--empty', 'aria-hidden': 'true' })];
    }
    els.draw.replaceChildren.apply(els.draw, kids);
    els.drawLabel.textContent = t('labelDraw', { n: n });
  }

  function renderDiscard(sel) {
    var n = state.discard.length;
    var kids;
    if (n) {
      var c = game.cards[state.discard[n - 1]];
      kids = underCards(n, 'card--under').concat(cardEl(c, 'button', {
        cls: 'is-top' + (sel === 'discard' ? ' is-selected' : ''),
        counter: c.kind === 'cat' ? '0/' + game.cats[c.cat].n : null,
        'data-drag': 'discard', 'data-fk': 'discard',
        'aria-pressed': sel === 'discard' ? 'true' : 'false',
        'aria-label': t(sel === 'discard' ? 'ariaDiscardCardSelected' : 'ariaDiscardCard', { word: cardLabel(c) })
      }));
    } else {
      kids = [h('div', { class: 'card card--empty', 'aria-hidden': 'true' },
        state.status === 'playing' ? h('span', { class: 'card__hint', text: t('parkHere') }) : null)];
    }
    els.discard.replaceChildren.apply(els.discard, kids);
    els.discard.setAttribute('aria-label', tn('ariaDiscard', n));
    els.discardLabel.textContent = t('labelDiscard', { n: n });
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
        h('span', { class: 'done__theme', 'data-len': themeLen(themeOf(cat)), text: themeOf(cat) }),
        h('span', { class: 'done__count', text: k + '/' + total })));
    } else {
      kids = [h('div', { class: 'card card--empty' },
        h('span', { class: 'card__hint', text: '0/' + total }))];
    }
    els.done.replaceChildren.apply(els.done, kids);
    els.done.setAttribute('aria-label', t('ariaDone', { k: k, total: total }));
    els.doneLabel.textContent = t('labelDone', { k: k, total: total });
  }

  function renderFields(sel) {
    if (state.status !== 'playing' && !ui.reveal && !ui.hold) {
      els.fields.classList.add('is-result');
      els.fields.replaceChildren(resultPanel());
      updateTimer();
      return;
    }
    els.fields.classList.remove('is-result');
    var nodes = [];
    for (var f = 0; f < state.fields.length; f++) nodes.push(fieldEl(f, sel));
    els.fields.replaceChildren.apply(els.fields, nodes);
  }

  function isNew(id) { return !!ui.lastPlaced && ui.lastPlaced.indexOf(id) >= 0; }
  /** --k = position in the unit that just landed (staggered pop). */
  function newK(id) { var k = ui.lastPlaced ? ui.lastPlaced.indexOf(id) : -1; return k > 0 ? ';--k:' + k : ''; }

  /** Elements of a playable unit ('draw' | 'discard' | 'f3'): a run has several cards. */
  function srcEls(key) {
    return Array.prototype.slice.call(els.board.querySelectorAll('[data-drag="' + key + '"]'));
  }

  /**
   * A bottom field that still holds cards: the face-down cards (compact; the
   * top one can be turned while nothing is face up), then the face-up run with
   * the normal stack offset. All run cards are selected / dragged together;
   * only the top one is a button (keyboard / screen reader).
   * --nd = face-down steps, --rl = run length - 1 (style.css squeezes the
   * face-down step so a run of 4 on 7 face-down cards fits the field).
   */
  function pileFieldEl(f, fl, sel, reveal) {
    // while a stack completes on the pile, its cards are shown on top of the face-down cards
    var d = fl.d, run = reveal ? reveal.cards : fl.c.slice(d);
    var kids = [], i;
    for (i = 0; i < d; i++) {
      if (i === d - 1 && !run.length) {
        kids.push(h('button', {
          type: 'button', class: 'card card--back card--down is-turnable', style: '--i:' + i,
          'data-action': 'turn', 'data-field': f, 'data-fk': 'turn' + f,
          'aria-label': t('ariaTurn', { f: f + 1, n: d })
        }));
      } else {
        kids.push(h('div', { class: 'card card--back card--down', style: '--i:' + i, 'aria-hidden': 'true' }));
      }
    }
    var selected = sel === f;
    var words = run.map(function (id) { return cardLabel(game.cards[id]); }).join(', ');
    var pileBase = run.length ? game.cards[run[0]] : null;
    var pileCounter = !reveal && pileBase && pileBase.kind === 'cat' ? (run.length - 1) + '/' + game.cats[pileBase.cat].n : null;
    run.forEach(function (id, r) {
      var c = game.cards[id], isTop = r === run.length - 1;
      var attrs = {
        cls: 'card--run' + (isTop ? ' card--down-top' : '') + ' is-top' + (selected ? ' is-selected' : '') + (isNew(id) ? ' is-new' : '') +
          (isTop && ui.flipField === f && !reveal ? ' is-flip' : ''),
        style: '--i:' + d + ';--r:' + r + newK(id),
        counter: isTop ? pileCounter : null,
        'data-drag': reveal ? null : 'f' + f,
        'data-fly': reveal ? '1' : null
      };
      if (isTop) {
        attrs['data-fk'] = 'f' + f;
        attrs['aria-pressed'] = selected ? 'true' : 'false';
        attrs['aria-label'] = (run.length > 1
          ? t(selected ? 'ariaRunSelected' : 'ariaRun', { f: f + 1, k: run.length, words: words })
          : t(selected ? 'ariaPileCardSelected' : 'ariaPileCard', { f: f + 1, word: words })) +
          (pileCounter ? ', ' + t('ariaCounter', { x: run.length - 1, y: game.cats[pileBase.cat].n }) : '');
      } else {
        attrs['aria-hidden'] = 'true';
      }
      kids.push(cardEl(c, isTop ? 'button' : 'div', attrs));
    });
    // tuck under: offered on the selected run, and on every possible run when nothing else helps
    if (!reveal && Core.canTuck(state, f) && (selected || ui.locked)) {
      kids.push(h('button', {
        type: 'button', class: 'tuck-btn' + (ui.locked ? ' is-hint' : ''), 'data-action': 'tuck', 'data-field': f,
        'data-fk': 'tuck' + f, 'aria-label': t('tuckBtn', { n: Core.CONFIG.TUCK_COST })
      }, h('span', { class: 'tuck-btn__icon', 'aria-hidden': 'true', text: '⤓' }),
        h('span', { class: 'tuck-btn__cost', 'aria-hidden': 'true', text: String(Core.CONFIG.TUCK_COST) })));
    }
    var steps = Math.max(1, run.length ? d : d - 1);
    var props = {
      class: 'field field--bottom field--pile' + (run.length > 1 ? ' has-run' : '') + (reveal ? ' is-complete' : ''), 'data-drop': String(f),
      style: '--nd:' + steps + ';--rl:' + Math.max(0, run.length - 1)
    };
    if (reveal) {
      var rcat = game.cats[reveal.cat];
      kids.push(h('div', { class: 'field__reveal tier-' + rcat.tier },
        h('span', { class: 'field__theme', 'data-len': themeLen(themeOf(rcat)), text: themeOf(rcat) + ' ✓' })));
      props.role = 'group';
      props['aria-label'] = themeOf(rcat).replace(SHY, '');
    } else if (run.length) {
      // a face-up word card (or category card) is a target: same-category word cards / runs go on it
      props.role = 'button';
      props.tabindex = '0';
      props['data-fk'] = 'drop' + f;
      props['aria-label'] = t('ariaPileRun', { f: f + 1, n: d, words: words });
    } else {
      props.role = 'group';
      props['aria-label'] = t('ariaPile', { f: f + 1, n: d });
    }
    return h('div', props, kids);
  }

  function fieldEl(f, sel) {
    var fl = state.fields[f];
    var reveal = ui.reveal && ui.reveal.field === f ? ui.reveal : null;
    var rowCls = f < Core.CONFIG.TOP_FIELDS ? ' field--top' : ' field--bottom';
    if (fl.p) return pileFieldEl(f, fl, sel, reveal);
    var ids = reveal ? reveal.cards : fl.c;
    // a category card alone on its field is playable: it can be taken back to Discard
    var lone = !reveal && Core.isLone(state, f, game) && state.status === 'playing';
    var kids = ids.map(function (id, i) {
      if (lone) {
        var selected = sel === f;
        return cardEl(game.cards[id], 'button', {
          cls: 'card--field card--lone is-top' + (selected ? ' is-selected' : '') + (isNew(id) ? ' is-new' : ''),
          counter: '0/' + game.cats[game.cards[id].cat].n,
          style: '--i:' + i, 'data-drag': 'f' + f, 'data-fk': 'f' + f,
          'aria-pressed': selected ? 'true' : 'false',
          'aria-label': t(selected ? 'ariaLoneSelected' : 'ariaLone', { f: f + 1, name: wordOf(game.cards[id]).replace(SHY, '') })
        });
      }
      return cardEl(game.cards[id], 'div', {
        cls: 'card--field' + (isNew(id) ? ' is-new' : ''),
        counter: !reveal && i === ids.length - 1 ? (ids.length - 1) + '/' + game.cats[game.cards[ids[0]].cat].n : null,
        style: '--i:' + i + newK(id), 'aria-hidden': 'true', 'data-fly': reveal ? '1' : null
      });
    });
    var label;
    if (reveal) {
      var cat = game.cats[reveal.cat];
      kids.push(h('div', { class: 'field__reveal tier-' + cat.tier },
        h('span', { class: 'field__theme', 'data-len': themeLen(themeOf(cat)), text: themeOf(cat) + ' ✓' })));
      label = themeOf(cat).replace(SHY, '');
    } else if (!ids.length) {
      kids = [h('span', { class: 'field__hint', text: t('fieldHint') })];
      label = t('ariaFieldEmpty', { f: f + 1 });
    } else {
      var base = game.cards[ids[0]];
      label = t('ariaField', {
        f: f + 1, cat: wordOf(base).replace(SHY, ''), k: ids.length - 1, max: game.cats[base.cat].n,
        words: ids.slice(1).map(function (id) { return wordOf(game.cards[id]); }).join(', ') || '–'
      });
    }
    return h('div', {
      class: 'field' + rowCls + (ids.length ? '' : ' is-empty') + (reveal ? ' is-complete' : ''),
      style: '--sn:' + Math.max(1, ids.length - 1), // covered cards: style.css squeezes long stacks
      'data-drop': String(f), 'data-fk': 'drop' + f, role: 'button', tabindex: '0', 'aria-label': label
    }, kids);
  }

  function resultPanel() {
    var won = state.status === 'won';
    var left = state.movesLeft;
    var shareBtn = h('button', { type: 'button', class: 'btn btn--primary result__share' }, t('share'));
    shareBtn.addEventListener('click', share);
    var parts = [h('h2', { class: 'result__title', text: t(won ? 'solved' : 'outOfMoves') })];
    if (won) {
      var starStr = Core.starString(Core.stars(left, game));
      parts.push(h('p', { class: 'result__stars', 'aria-label': t('ariaStars', { n: Core.stars(left, game) }) },
        starStr.split('').map(function (ch, i) {
          return h('span', { class: 'result__star' + (ch === '★' ? ' is-on' : ''), style: '--k:' + i, 'aria-hidden': 'true', text: ch });
        })));
      parts.push(h('p', { class: 'result__meta', text: t('resultMeta', { moves: tn('movesLeft', left), streak: streakNow() }) }));
    } else {
      parts.push(h('p', { class: 'result__lost', text: t('resultLost', { k: state.done.length, total: game.cats.length }) }));
      parts.push(h('p', { class: 'result__meta', text: t('resultMetaLost', { streak: streakNow() }) }));
    }
    var rt = state.ratings || { perfect: 0, good: 0, detour: 0 };
    parts.push(h('p', { class: 'result__tally', text: t('tally', { p: rt.perfect, g: rt.good, d: rt.detour }) }));
    if (state.practice) parts.push(h('p', { class: 'result__practice', text: t('practiceNote') }));
    parts.push(shareBtn);
    parts.push(h('p', { class: 'result__next' }, t('nextPuzzle'),
      h('span', { class: 'result__timer', id: 'timer', text: Core.formatCountdown(Core.msUntilMidnight(new Date())) })));
    return h('section', { class: 'result' + (won ? '' : ' result--lost'), 'aria-live': 'polite' }, parts);
  }

  function updateTimer() {
    var el = document.getElementById('timer');
    if (el) el.textContent = Core.formatCountdown(Core.msUntilMidnight(new Date()));
  }

  function flash(el, cls, ms) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth; // restart animation
    el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, ms || FEEDBACK_MS);
  }

  function dropEl(dest) { return els.board.querySelector('[data-drop="' + dest + '"]'); }

  function toast(msg, ms, long) {
    clearTimeout(toastTimer);
    els.toast.textContent = msg;
    els.toast.classList.toggle('is-long', !!long);
    els.toast.classList.add('is-visible');
    toastTimer = setTimeout(function () { els.toast.classList.remove('is-visible'); }, ms || 1400);
  }

  /* ---------- actions ---------- */
  /**
   * Play the card at `from` onto `to`. `drag` (optional) is the finished
   * pointer interaction whose ghost should land or snap back.
   */
  function doPlay(from, to, drag) {
    var rating = null;
    try { rating = Core.rateMove(state, game, [from, to]); } catch (e) { rating = null; } // judged on the state before
    var res = Core.play(state, game, from, to);
    if (!res.ok) {
      if (res.cost || res.mistake) save();
      if (res.lost) ui.hold = true;
      if (res.reason === 'drawOnly') { ui.sel = 'draw'; ui.picked = false; }
      render();
      if (drag) snapBack(drag);
      else if (res.mistake || res.reason === 'drawOnly') srcEls(srcKey(from)).forEach(function (el) { flash(el, 'is-bounce'); });
      if (res.reason === 'drawOnly') toast(t('toastDrawOnly')); // bottom cards never go to Discard (free)
      if (res.reason === 'fixed') toast(t('toastLone'));         // a lone category card only goes back to Discard (free)
      if (res.mistake) {
        ui.perfectRun = 0;
        flash(dropEl(to), 'is-wrong');
        srcEls(srcKey(from)).forEach(function (el) { flash(el, 'is-nope', 520); });
        fx('sound.wrong');
        toast(t('toastWrong'));
      }
      if (res.lost) endLost();
      return;
    }
    if (drag) removeGhost(drag);
    ui.sel = 'draw';
    ui.picked = false;
    if (rating) Core.addRating(state, rating);
    ui.perfectRun = rating === 'perfect' ? ui.perfectRun + 1 : 0;
    save();
    flash(els.moves.parentNode, 'is-tick', 300);
    if (res.completed !== undefined) {
      ui.lastPlaced = res.ids;
      runCompletion(to, res);
      showRating(rating, res, to);
      return;
    }
    if (to !== 'discard') ui.lastPlaced = res.ids;
    if (res.lost) ui.hold = true;
    render();
    if (to !== 'discard') {
      flash(dropEl(to), 'is-correct');
      if (rating === 'perfect') flash(dropEl(to), 'is-glow', 700);
    }
    showRating(rating, res, to);
    if (res.lost) endLost();
  }

  /**
   * Floating move rating at the drop point (fx.js draws it):
   * Perfect (big, sparkles, rising chime; "Perfect ×n" in a row), Good (medium,
   * soft tick) or Detour (small, muted, soft low tone).
   */
  function showRating(rating, res, to) {
    if (!rating) return;
    var el = to === 'discard' ? els.discard : (els.board.querySelector('[data-card="' + res.ids[res.ids.length - 1] + '"]') || dropEl(to));
    var r = el ? el.getBoundingClientRect() : { left: innerWidth / 2, width: 0, top: innerHeight / 2, height: 0 };
    var x = r.left + r.width / 2, y = r.top + Math.min(r.height / 2, 24);
    var n = ui.perfectRun;
    var text = rating === 'perfect'
      ? (n >= PERFECT_STREAK_MIN ? t('ratePerfectRun', { n: n }) : t('ratePerfect'))
      : t(rating === 'good' ? 'rateGood' : 'rateDetour');
    fx('rating', x, y, rating, text, n);
    if (rating === 'perfect') {
      if (to !== 'discard') fx('sparkle', x, y);
      fx('sound.place', Math.max(1, n));
    } else {
      fx(rating === 'good' ? 'sound.good' : 'sound.detour');
    }
  }


  /** Out of moves: show the board a moment longer, then the result panel. */
  function endLost() {
    ui.busy = true;
    els.board.classList.add('is-busy');
    recordResult();
    fx('sound.lose');
    var gen = ui.gen;
    setTimeout(function () {
      if (gen !== ui.gen) return; // restarted meanwhile
      ui.hold = false;
      ui.busy = false;
      els.board.classList.remove('is-busy');
      render();
      toast(t('outOfMoves'));
    }, reducedMotion() ? 200 : LOST_DELAY_MS);
  }

  function doFlip() {
    if (!Core.flip(state)) return;
    ui.sel = 'draw';
    ui.picked = false;
    save();
    render();
  }

  /** Tuck the run of pile f under its face-down cards (TUCK_COST moves). */
  function doTuck(f) {
    if (ui.busy) return;
    var rating = Core.rateTuck(state, game);
    var res = Core.tuck(state, game, f);
    if (!res.ok) return;
    Core.addRating(state, rating);
    ui.perfectRun = 0;
    ui.sel = 'draw';
    ui.picked = false;
    if (res.lost) ui.hold = true;
    save();
    flash(els.moves.parentNode, 'is-tick', 300);
    render();
    flash(dropEl(f), 'is-glow', 700);
    showRating(rating, { ids: res.ids }, f);
    fx('sound.flip');
    if (res.lost) endLost();
  }

  function doTurn(f) {
    if (!Core.turn(state, f)) return;
    ui.sel = f; // the turned card is ready to play
    ui.picked = false;
    ui.flipField = f;
    save();
    fx('sound.flip');
    render();
  }

  function runCompletion(f, res) {
    ui.busy = true;
    els.board.classList.add('is-busy');
    ui.reveal = { field: f, cards: res.completedCards, cat: res.completed };
    render();
    flash(dropEl(f), 'is-correct');
    var fieldNode = dropEl(f);
    if (fieldNode) {
      fieldNode.classList.add('is-celebrate');
      var lab = fieldNode.querySelector('.field__reveal');
      var tierCol = lab ? getComputedStyle(lab).getPropertyValue('--tier-bg').trim() : '';
      fx('celebrate', fieldNode.getBoundingClientRect(), tierCol ? [tierCol] : []);
    }
    fx('sound.complete');
    var quick = reducedMotion();
    var gen = ui.gen;
    setTimeout(function () {
      if (gen !== ui.gen) return;
      var flyMs = quick ? 0 : flyToDone(f);
      setTimeout(function () {
        if (gen !== ui.gen) return; // restarted meanwhile
        ui.reveal = null;
        ui.busy = false;
        ui.donePop = !quick;
        els.board.classList.remove('is-busy');
        if (res.won || res.lost) recordResult();
        render();
        flash(els.doneLabel, 'is-bump', 450);
        if (res.won) {
          toast(t('toastSolved'));
          fx('rain');
          fx('sound.win');
        } else if (res.lost) {
          toast(t('outOfMoves'));
          fx('sound.lose');
        }
      }, flyMs);
    }, quick ? 500 : REVEAL_MS);
  }

  /** Animate the cards of field f onto the Done pile. Returns duration in ms. */
  function flyToDone(f) {
    var field = dropEl(f);
    if (!field) return 0;
    var target = els.done.getBoundingClientRect();
    var cardsEls = field.querySelectorAll('[data-fly]'); // the completed cards (not a pile's face-down cards)
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
    var mid = (clones.length - 1) / 2;
    clones.forEach(function (c) {
      // 1. fan up (each card a little rotated), 2. fly to Done one after another
      c.g.style.transformOrigin = '50% 100%';
      c.g.style.transition = 'transform ' + FAN_MS + 'ms cubic-bezier(.3,1.5,.5,1)';
      c.g.style.transform = 'translateY(-12px) rotate(' + ((c.i - mid) * 7) + 'deg)';
    });
    setTimeout(function () {
      clones.forEach(function (c) {
        var delay = c.i * FLY_STAGGER;
        c.g.style.transformOrigin = '0 0';
        c.g.style.transition = 'transform ' + FLY_MS + 'ms cubic-bezier(.5,0,.3,1) ' + delay + 'ms, opacity ' + FLY_MS + 'ms ease ' + delay + 'ms';
        c.g.style.transform = 'translate(' + c.dx + 'px,' + c.dy + 'px) scale(' + c.s + ') rotate(12deg)';
      });
    }, FAN_MS);
    var total = FAN_MS + FLY_MS + clones.length * FLY_STAGGER;
    setTimeout(function () {
      clones.forEach(function (c) { if (c.g.parentNode) c.g.parentNode.removeChild(c.g); });
    }, total + 20);
    return total;
  }

  function recordResult() {
    if (state.recorded) return;
    state.recorded = true;
    if (!isOverride && !state.practice) { // a replay after the day was finished doesn't count
      store.set(KEY_STATS, JSON.stringify(Core.updateStats(loadStats(), day, state.status === 'won', state.movesLeft, game)));
    }
    save();
  }

  /**
   * A tap (or Enter/Space) on a playable card, a pile, a field or a button.
   * The draw card is selected by default. Tap a playable card = pick it (a
   * run: the whole run); tap the picked card again = discard it (only the
   * draw card may go there; a run is refused for free with a hint).
   * Tap a field = play the selected card there. Tap a run while a picked card
   * / run of its category is selected = play it onto the run; otherwise the
   * tap picks the run. A category card alone on a field: tapping it plays
   * the selected card onto it if that fits, otherwise picks it; then tap
   * Discard (or the card again) to take it back (1 move). Tap the Discard
   * pile beside its card while a card is selected = discard it.
   */
  function tap(el) {
    var action = el.dataset.action;
    if (action === 'done') { openModal('done-modal'); return; }
    if (ui.busy || state.status !== 'playing') return;
    if (action === 'flip') { doFlip(); return; }
    if (action === 'turn') { doTurn(parseInt(el.dataset.field, 10)); return; }
    if (action === 'tuck') { doTuck(parseInt(el.dataset.field, 10)); return; }

    var sel = selSource();
    if (el.dataset.drag) {
      var src = parseSrc(el.dataset.drag);
      if (src === 'discard') {
        // a lone category card selected: take it back
        if (typeof sel === 'number' && Core.isLone(state, sel, game)) { doPlay(sel, 'discard'); return; }
        // otherwise tapping the Discard card picks it (again: back to the draw card)
        ui.sel = sel === 'discard' ? 'draw' : 'discard';
        ui.picked = ui.sel === 'discard';
        render();
        return;
      }
      if (typeof src === 'number' && (ui.picked || Core.isLone(state, src, game)) && sel !== null && sel !== src &&
          Core.placeReject(state, game, Core.unitOf(state, sel, game)[0], src) === null) {
        doPlay(sel, src);
        return;
      }
      if (sel === src && ui.picked) { doPlay(src, 'discard'); return; }
      ui.sel = src;
      ui.picked = true;
      render();
      return;
    }
    var dest = el.dataset.drop;
    if (dest === 'discard') {
      if (sel !== null && sel !== 'discard') doPlay(sel, 'discard');
      return;
    }
    if (dest === undefined || sel === null) return;
    var f = +dest;
    var fl = state.fields[f];
    if (!fl || (fl.p && fl.d >= fl.c.length)) return; // face-down top card: not a target
    doPlay(sel, f);
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
      var el = e.target.closest('[data-drag],[data-drop],[data-action]');
      if (!el || !els.board.contains(el) || el !== e.target) return;
      e.preventDefault();
      tap(el);
    });
  }

  function onDown(e) {
    if (ptr || e.isPrimary === false) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    var el = e.target.closest('[data-drag],[data-drop],[data-action]');
    if (!el || !els.board.contains(el)) return;
    if (!state) return;
    if (el.closest('.result')) return; // let the share button work normally
    e.preventDefault(); // no text selection / focus steal / emulated mouse events
    var dragEl = e.target.closest('[data-drag]');
    ptr = {
      id: e.pointerId, x0: e.clientX, y0: e.clientY,
      target: el, dragEl: dragEl && els.board.contains(dragEl) && !ui.busy && state.status === 'playing' ? dragEl : null,
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

  /** Copy of a card for a ghost, without ids / state. */
  function ghostCard(el) {
    var g = el.cloneNode(true);
    ['data-drag', 'data-card', 'data-fk', 'aria-label', 'aria-pressed'].forEach(function (a) { g.removeAttribute(a); });
    g.classList.remove('is-selected', 'is-new', 'is-drag-source', 'is-bounce');
    g.setAttribute('aria-hidden', 'true');
    g.tabIndex = -1;
    return g;
  }

  /** Start dragging: a ghost of the card, or of the whole run (all its cards, as they lie). */
  function startDrag() {
    var el = ptr.dragEl;
    var list = srcEls(el.dataset.drag);
    if (!list.length) list = [el];
    var rects = list.map(function (x) { return x.getBoundingClientRect(); });
    var r = {
      left: Math.min.apply(null, rects.map(function (x) { return x.left; })),
      top: Math.min.apply(null, rects.map(function (x) { return x.top; })),
      right: Math.max.apply(null, rects.map(function (x) { return x.right; })),
      bottom: Math.max.apply(null, rects.map(function (x) { return x.bottom; }))
    };
    r.width = r.right - r.left;
    r.height = r.bottom - r.top;
    var ghost;
    if (list.length === 1) {
      ghost = ghostCard(el);
      ghost.classList.add('card-ghost');
    } else {
      ghost = h('div', { class: 'card-ghost-run', 'aria-hidden': 'true' });
      list.forEach(function (x, i) {
        var g = ghostCard(x), gs = g.style;
        g.classList.add('card-ghost-run__card');
        gs.position = 'absolute';
        gs.left = (rects[i].left - r.left) + 'px';
        gs.top = (rects[i].top - r.top) + 'px';
        gs.width = rects[i].width + 'px';
        gs.height = rects[i].height + 'px';
        gs.margin = '0';
        ghost.appendChild(g);
      });
    }
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
    ptr.src = el.dataset.drag; // 'draw' | 'discard' | 'f3'
    ptr.srcEls = list;
    list.forEach(function (x) { x.classList.add('is-drag-source'); });
    document.body.classList.add('is-dragging');
  }

  function dropAt(x, y) {
    var hit = document.elementFromPoint(x, y);
    var el = hit && hit.closest('[data-drop]');
    return el && els.board.contains(el) ? el : null;
  }

  function setOver(el) {
    if (el === ptr.over) return;
    if (ptr.over) ptr.over.classList.remove('is-drop-target');
    if (el) el.classList.add('is-drop-target');
    ptr.over = el;
  }

  /** Ends the pointer interaction; the ghost (if any) stays until removeGhost/snapBack. */
  function endPointer() {
    var p = ptr;
    ptr = null;
    if (!p) return null;
    if (p.over) p.over.classList.remove('is-drop-target');
    (p.srcEls || (p.dragEl ? [p.dragEl] : [])).forEach(function (x) { x.classList.remove('is-drag-source'); });
    document.body.classList.remove('is-dragging');
    return p;
  }

  function removeGhost(p) {
    if (p && p.ghost && p.ghost.parentNode) p.ghost.parentNode.removeChild(p.ghost);
  }

  /** Fly the ghost back to where the drag started, hiding the real card meanwhile. */
  function snapBack(p) {
    if (!p.ghost) return;
    var src = srcEls(p.src); // re-rendered elements of the same unit
    if (reducedMotion() || !p.srcRect) { removeGhost(p); return; }
    src.forEach(function (x) { x.classList.add('is-drag-source'); });
    var g = p.ghost;
    g.classList.add('is-returning');
    g.style.transition = 'left 220ms cubic-bezier(.3,1.4,.5,1), top 220ms cubic-bezier(.3,1.4,.5,1), transform 220ms ease';
    void g.offsetWidth;
    g.style.left = p.srcRect.left + 'px';
    g.style.top = p.srcRect.top + 'px';
    setTimeout(function () {
      removeGhost(p);
      src.forEach(function (x) { x.classList.remove('is-drag-source'); });
    }, 240);
  }

  function onUp(e) {
    if (!ptr || e.pointerId !== ptr.id) return;
    var p = endPointer();
    if (p.dragging) {
      var el = dropAt(e.clientX, e.clientY);
      handleDrop(p, el ? el.dataset.drop : null);
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
    var from = parseSrc(p.src);
    var to = dest === 'discard' ? 'discard' : +dest;
    // dropped back where it came from: not a move (a face-down pile top is refused by
    // Core.play for free, a bottom card on Discard too - with a hint)
    if (to === from || (to === 'discard' && from === 'discard')) {
      snapBack(p);
      return;
    }
    doPlay(from, to, p);
  }

  /* ---------- share ---------- */
  function share() {
    var text = Core.shareText(puzzleNo, {
      won: state.status === 'won', movesLeft: state.movesLeft, done: state.done.length, total: game.cats.length,
      stars: Core.stars(state.movesLeft, game), ratings: state.ratings
    }, streakNow(), t);
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
      toast(t(ok ? 'toastCopied' : 'toastCopyFailed'));
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { toast(t('toastCopied')); }, fallback);
        return;
      }
    } catch (e) { /* fall through */ }
    fallback();
  }

  /* ---------- modals ---------- */
  function bindModals() {
    document.getElementById('help-btn').addEventListener('click', function () { openModal('help-modal'); });
    document.getElementById('stats-btn').addEventListener('click', function () { openModal('stats-modal'); });
    document.getElementById('restart-btn').addEventListener('click', function () { if (game) openModal('restart-modal'); });
    document.getElementById('restart-ok').addEventListener('click', function () {
      closeModal(document.getElementById('restart-modal'));
      restart();
    });
    var snd = document.getElementById('sound-toggle');
    snd.addEventListener('click', function () {
      if (FXo) FXo.setSound(!FXo.soundOn());
      renderSoundToggle();
      if (FXo && FXo.soundOn()) fx('sound.place', 1);
    });
    renderSoundToggle();
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

  /** Sound switch in the how-to sheet (fx.js keeps the setting). */
  function renderSoundToggle() {
    var b = document.getElementById('sound-toggle');
    if (!b) return;
    var on = FXo ? FXo.soundOn() : false;
    b.setAttribute('aria-checked', on ? 'true' : 'false');
    b.classList.toggle('is-on', on);
    b.hidden = !FXo;
  }

  /**
   * Start today's puzzle over: same deal, full moves. If today's result was
   * already recorded, the new round is a practice round (doesn't count).
   */
  function restart() {
    if (!game) return;
    if (ptr) onCancel();
    var practice = !isOverride && (state.recorded || state.practice || loadStats().lastPlayedDay === day);
    ui.gen += 1;
    ui.busy = false;
    ui.hold = false;
    ui.reveal = null;
    ui.sel = 'draw';
    ui.picked = false;
    ui.perfectRun = 0;
    ui.lastPlaced = null;
    els.board.classList.remove('is-busy');
    document.querySelectorAll('.card-flying,.card-ghost,.card-ghost-run').forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
    fx('clear');
    state = Core.newGame(game, day, practice);
    save();
    render();
    toast(t('toastRestarted'));
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
      list.replaceChildren(h('li', { class: 'done-list__empty', text: t('doneEmpty') }));
      return;
    }
    list.replaceChildren.apply(list, state.done.map(function (ci) {
      var cat = game.cats[ci];
      var words = game.cards.filter(function (c) { return c.cat === ci && c.kind === 'word'; }).map(wordOf);
      return h('li', { class: 'done-list__item tier-' + cat.tier },
        h('strong', { class: 'done-list__theme', text: themeOf(cat).replace(SHY, '') }),
        h('span', { class: 'done-list__words', text: words.join(' · ') }));
    }));
  }

  function renderStats() {
    var s = loadStats();
    var items = [
      [s.played, t('statPlayed')],
      [s.solved, t('statSolved')],
      [Core.currentStreak(s, realDay), t('statStreak')],
      [s.best, t('statBest')],
      [s.stars[2], t('statThreeStars')]
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
