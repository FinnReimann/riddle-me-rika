/* =========================================================================
   i18n.js - every text the player sees, in English (en) and German (de)
   -------------------------------------------------------------------------
   HOW TO EDIT
   - Change the text on the right-hand side. Keep the keys (left side) and
     keep both languages in sync: every key must exist in en AND de.
   - {name} is a placeholder that the game fills in, e.g. {n} = a number.
     Keep the placeholders, you may move them around in the sentence.
   - Keys ending in One / Other are singular / plural ("1 move left", "2 moves left").
   - The game title "Riddle Me Rika" is not translated (index.html).
   - Card words and category names are NOT here: they live in categories.js
     (word / wordDe, theme / themeDe).
   ========================================================================= */
(function (root) {
  'use strict';

  var I18N = {
    /* ---------------------------------------------------------------- EN */
    en: {
      // Language button (header). langSwitch = aria-label (says what a tap
      // does), langBadge = small label of the CURRENT language on the button.
      langSwitch: 'Switch to German',
      langBadge: 'EN',
      dateLocale: 'en-US',              // date format in the header

      // Header
      sub: '#{no} · {date}',             // subtitle: puzzle number · date
      helpBtn: 'How to play',            // aria-label
      statsBtn: 'Statistics',            // aria-label
      close: 'Close',                    // aria-label of the X in modals

      // Status row + pile labels
      moves: 'Moves',                    // move counter ("Moves 38"), counts down
      labelDraw: 'Draw · {n}',
      labelDiscard: 'Discard · {n}',
      labelDone: 'Done · {k}/{total}',
      parkHere: 'Park here',             // empty discard pile
      fieldHint: 'Category card here',   // empty field
      flipDiscard: 'Flip discard',       // button on the empty draw pile

      // Toasts
      toastWrong: 'Doesn’t fit',
      toastSolved: 'Solved!',
      toastCopied: 'Copied',
      toastCopyFailed: 'Could not copy',

      // Screen-reader labels (aria-label)
      ariaCategoryCard: 'category card {name}',
      ariaDraw: 'Draw pile: {word}',
      ariaDrawSelected: 'Draw pile: {word} (selected, tap again to discard)',
      ariaDiscardCard: 'Discard pile: {word}',
      ariaDiscardCardSelected: 'Discard pile: {word} (selected)',
      ariaDiscardOne: 'Discard pile, {n} card',
      ariaDiscardOther: 'Discard pile, {n} cards',
      ariaFlip: 'Flip discard pile into draw pile',
      ariaDone: 'Done pile, {k} of {total} categories. Show completed categories',
      ariaFieldEmpty: 'Field {f}, empty. Category card here',
      ariaField: 'Field {f}: {cat}, {k} of {max} cards: {words}',
      ariaPile: 'Field {f}, {n} dealt cards',
      ariaTurn: 'Field {f}: turn the top card over ({n} face down)',
      ariaPileCard: 'Field {f}: {word}',
      ariaPileCardSelected: 'Field {f}: {word} (selected, tap again to discard)',
      ariaStars: '{n} of 3 stars',

      // Result panel (replaces the fields when the game is over)
      solved: 'Solved!',
      outOfMoves: 'Out of moves',
      movesLeftOne: '{n} move left',
      movesLeftOther: '{n} moves left',
      resultMeta: '{moves} · Streak {streak}',
      resultLost: '{k} of {total} categories done',
      resultMetaLost: 'Streak {streak}',
      share: 'Share',
      nextPuzzle: 'Next puzzle in ',

      // Share text (one line each; no spoilers)
      shareLost: 'Out of moves · {k}/{total}',
      shareStreak: 'Streak: {n}',

      // How-to modal ({moves}, {cats}, {cards} come from the top of game.js)
      helpTitle: 'How to play',
      help1: 'Finish all {cats} categories with {moves} moves.',
      help2: 'Put a category card on an empty field, then stack its {cards} word cards on it.',
      help3: 'Every card you play costs a move – a wrong one too (it bounces back).',
      help4: 'Tap face-down cards to turn them over (free). An emptied bottom field is a free field.',
      help5: 'Park cards on Discard. Draw pile empty? Flip the discard pile (free).',
      helpTip: 'Drag a card, or tap it and then tap where it goes. Tap a card twice to discard it.',
      helpDaily: 'A new puzzle every day at midnight.',
      play: 'Play',

      // Statistics modal
      statsTitle: 'Statistics',
      statPlayed: 'Played',
      statSolved: 'Solved',
      statStreak: 'Streak',
      statBest: 'Best streak',
      statThreeStars: '★★★ games',

      // Completed sheet (tap the Done pile)
      doneTitle: 'Completed',
      doneEmpty: 'No categories completed yet.',

      // Errors
      errNotEnough: 'Not enough categories for a game.',
      errNoCategories: 'No categories found.'
    },

    /* ---------------------------------------------------------------- DE */
    de: {
      langSwitch: 'Auf Englisch umschalten',
      langBadge: 'DE',
      dateLocale: 'de-DE',

      sub: '#{no} · {date}',
      helpBtn: 'Anleitung',
      statsBtn: 'Statistik',
      close: 'Schließen',

      moves: 'Züge',
      labelDraw: 'Nachziehen · {n}',
      labelDiscard: 'Ablage · {n}',
      labelDone: 'Fertig · {k}/{total}',
      parkHere: 'Hier parken',
      fieldHint: 'Kategorie-Karte hierher',
      flipDiscard: 'Ablage umdrehen',

      toastWrong: 'Passt nicht',
      toastSolved: 'Gelöst!',
      toastCopied: 'Kopiert',
      toastCopyFailed: 'Kopieren ging nicht',

      ariaCategoryCard: 'Kategorie-Karte {name}',
      ariaDraw: 'Nachziehstapel: {word}',
      ariaDrawSelected: 'Nachziehstapel: {word} (ausgewählt, nochmal tippen zum Ablegen)',
      ariaDiscardCard: 'Ablage: {word}',
      ariaDiscardCardSelected: 'Ablage: {word} (ausgewählt)',
      ariaDiscardOne: 'Ablage, {n} Karte',
      ariaDiscardOther: 'Ablage, {n} Karten',
      ariaFlip: 'Ablage umdrehen und zum Nachziehstapel machen',
      ariaDone: 'Fertig-Stapel, {k} von {total} Kategorien. Fertige Kategorien zeigen',
      ariaFieldEmpty: 'Feld {f}, leer. Kategorie-Karte hierher',
      ariaField: 'Feld {f}: {cat}, {k} von {max} Karten: {words}',
      ariaPile: 'Feld {f}, {n} ausgeteilte Karten',
      ariaTurn: 'Feld {f}: oberste Karte umdrehen ({n} verdeckt)',
      ariaPileCard: 'Feld {f}: {word}',
      ariaPileCardSelected: 'Feld {f}: {word} (ausgewählt, nochmal tippen zum Ablegen)',
      ariaStars: '{n} von 3 Sternen',

      solved: 'Gelöst!',
      outOfMoves: 'Keine Züge mehr',
      movesLeftOne: '{n} Zug übrig',
      movesLeftOther: '{n} Züge übrig',
      resultMeta: '{moves} · Serie {streak}',
      resultLost: '{k} von {total} Kategorien geschafft',
      resultMetaLost: 'Serie {streak}',
      share: 'Teilen',
      nextPuzzle: 'Nächstes Rätsel in ',

      shareLost: 'Keine Züge mehr · {k}/{total}',
      shareStreak: 'Serie: {n}',

      helpTitle: 'So geht’s',
      help1: 'Schaff alle {cats} Kategorien mit {moves} Zügen.',
      help2: 'Leg eine Kategorie-Karte auf ein leeres Feld und stapel ihre {cards} Wort-Karten drauf.',
      help3: 'Jede Karte, die du spielst, kostet einen Zug – auch eine falsche (die springt zurück).',
      help4: 'Tipp verdeckte Karten an, um sie umzudrehen (gratis). Ein leer geräumtes unteres Feld ist frei.',
      help5: 'Park Karten auf der Ablage. Nachziehstapel leer? Dreh die Ablage um (gratis).',
      helpTip: 'Zieh eine Karte oder tipp sie an und dann dahin, wo sie hin soll. Zweimal antippen legt sie ab.',
      helpDaily: 'Jeden Tag um Mitternacht gibt’s ein neues Rätsel.',
      play: 'Los geht’s',

      statsTitle: 'Statistik',
      statPlayed: 'Gespielt',
      statSolved: 'Gelöst',
      statStreak: 'Serie',
      statBest: 'Beste Serie',
      statThreeStars: '★★★-Spiele',

      doneTitle: 'Geschafft',
      doneEmpty: 'Noch keine Kategorie geschafft.',

      errNotEnough: 'Zu wenige Kategorien für ein Spiel.',
      errNoCategories: 'Keine Kategorien gefunden.'
    }
  };

  if (typeof module === 'object' && module.exports) module.exports = I18N;
  root.RIKA_I18N = I18N;
})(typeof window !== 'undefined' ? window : globalThis);
