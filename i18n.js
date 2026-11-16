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
      fieldHint: 'Category card or cards', // empty field
      flipDiscard: 'Flip discard',       // button on the empty draw pile

      // Toasts
      toastWrong: 'Doesn’t fit',
      toastDrawOnly: 'Can’t go to Discard',  // a run or a bottom card dropped on Discard (free)
      toastLone: 'Only back to Discard',  // a lone category card dropped on another field (free)
      toastSolved: 'Solved!',
      toastCopied: 'Copied',
      toastCopyFailed: 'Could not copy',

      // Screen-reader labels (aria-label)
      ariaCategoryCard: 'category card {name}, {n} cards',
      ariaDraw: 'Draw pile: {word}',
      ariaDrawSelected: 'Draw pile: {word} (selected, tap again to discard)',
      ariaDiscardCard: 'Discard pile: {word}',
      ariaDiscardCardSelected: 'Discard pile: {word} (selected)',
      ariaDiscardOne: 'Discard pile, {n} card',
      ariaDiscardOther: 'Discard pile, {n} cards',
      ariaFlip: 'Flip discard pile into draw pile',
      ariaDone: 'Done pile, {k} of {total} categories. Show completed categories',
      ariaFieldEmpty: 'Field {f}, empty. Category card or word cards here',
      ariaField: 'Field {f}: {cat}, {k} of {max} cards: {words}',
      ariaPile: 'Field {f}, {n} dealt cards',
      ariaTurn: 'Field {f}: turn the top card over ({n} face down)',
      ariaPileRun: 'Field {f}, {n} face down, face up: {words}',
      ariaPileCard: 'Field {f}: {word}',
      ariaPileCardSelected: 'Field {f}: {word} (selected)',
      ariaRun: 'Field {f}: run of {k} cards: {words}',
      ariaLoose: 'Field {f}: word cards without category card: {words}',
      ariaLooseSelected: 'Field {f}: word cards without category card: {words} (selected)',
      ariaLone: 'Field {f}: category card {name}, no word cards yet',
      ariaLoneSelected: 'Field {f}: category card {name} (selected, tap Discard to take it back)',
      ariaRunSelected: 'Field {f}: run of {k} cards: {words} (selected)',
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

      // How-to modal ({cats} from the top of game.js, {moves} = today's move budget)
      helpTitle: 'How to play',
      help1: 'Finish all {cats} categories with {moves} moves.',
      help2: 'Put a category card on an empty field, then stack its word cards on it. The number on the category card says how many. Empty fields also take word cards – move them onto their category card later.',
      help3: 'Every card you play costs a move – a wrong one too (it bounces back).',
      help4: 'Tap face-down cards to turn them over (free). An emptied bottom field is a free field.',
      helpRuns: 'On a bottom field you can pile word cards onto a face-up card of their category – a word card or the category card itself (it completes right there). Such a run moves as a whole, for one move; with its category card only onto a free field.',
      help5: 'Park draw cards on Discard. A category card still alone on its field can go back there too (1 move). Draw pile empty? Flip the discard pile (free).',
      helpTip: 'Drag a card or run, or tap it and then tap where it goes. Tap the draw card twice to discard it.',
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
      fieldHint: 'Kategorie-Karte oder Karten',
      flipDiscard: 'Ablage umdrehen',

      toastWrong: 'Passt nicht',
      toastDrawOnly: 'Nicht auf die Ablage',
      toastLone: 'Nur zurück auf die Ablage',
      toastSolved: 'Gelöst!',
      toastCopied: 'Kopiert',
      toastCopyFailed: 'Kopieren ging nicht',

      ariaCategoryCard: 'Kategorie-Karte {name}, {n} Karten',
      ariaDraw: 'Nachziehstapel: {word}',
      ariaDrawSelected: 'Nachziehstapel: {word} (ausgewählt, nochmal tippen zum Ablegen)',
      ariaDiscardCard: 'Ablage: {word}',
      ariaDiscardCardSelected: 'Ablage: {word} (ausgewählt)',
      ariaDiscardOne: 'Ablage, {n} Karte',
      ariaDiscardOther: 'Ablage, {n} Karten',
      ariaFlip: 'Ablage umdrehen und zum Nachziehstapel machen',
      ariaDone: 'Fertig-Stapel, {k} von {total} Kategorien. Fertige Kategorien zeigen',
      ariaFieldEmpty: 'Feld {f}, leer. Kategorie-Karte oder Wort-Karten hierher',
      ariaField: 'Feld {f}: {cat}, {k} von {max} Karten: {words}',
      ariaPile: 'Feld {f}, {n} ausgeteilte Karten',
      ariaTurn: 'Feld {f}: oberste Karte umdrehen ({n} verdeckt)',
      ariaPileRun: 'Feld {f}, {n} verdeckt, offen: {words}',
      ariaPileCard: 'Feld {f}: {word}',
      ariaPileCardSelected: 'Feld {f}: {word} (ausgewählt)',
      ariaRun: 'Feld {f}: Reihe aus {k} Karten: {words}',
      ariaLoose: 'Feld {f}: Wort-Karten ohne Kategorie-Karte: {words}',
      ariaLooseSelected: 'Feld {f}: Wort-Karten ohne Kategorie-Karte: {words} (ausgewählt)',
      ariaLone: 'Feld {f}: Kategorie-Karte {name}, noch ohne Wort-Karten',
      ariaLoneSelected: 'Feld {f}: Kategorie-Karte {name} (ausgewählt, Ablage antippen zum Zurücknehmen)',
      ariaRunSelected: 'Feld {f}: Reihe aus {k} Karten: {words} (ausgewählt)',
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
      help2: 'Leg eine Kategorie-Karte auf ein leeres Feld und stapel ihre Wort-Karten drauf. Die Zahl auf der Kategorie-Karte sagt, wie viele. Leere Felder nehmen auch Wort-Karten – leg sie später auf ihre Kategorie-Karte.',
      help3: 'Jede Karte, die du spielst, kostet einen Zug – auch eine falsche (die springt zurück).',
      help4: 'Tipp verdeckte Karten an, um sie umzudrehen (gratis). Ein leer geräumtes unteres Feld ist frei.',
      helpRuns: 'Auf einem unteren Feld kannst du Wort-Karten auf eine offene Karte ihrer Kategorie legen – eine Wort-Karte oder die Kategorie-Karte selbst (dann wird sie dort fertig). So eine Reihe bewegst du als Ganzes für einen Zug, mit Kategorie-Karte nur auf ein freies Feld.',
      help5: 'Auf die Ablage dürfen Karten vom Nachziehstapel – und eine Kategorie-Karte, die noch allein auf ihrem Feld liegt (1 Zug). Nachziehstapel leer? Dreh die Ablage um (gratis).',
      helpTip: 'Zieh eine Karte oder Reihe oder tipp sie an und dann dahin, wo sie hin soll. Die Nachziehkarte zweimal antippen legt sie ab.',
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
