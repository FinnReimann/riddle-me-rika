/* =========================================================================
   i18n.js - every text the player sees, in English (en) and German (de)
   -------------------------------------------------------------------------
   HOW TO EDIT
   - Change the text on the right-hand side. Keep the keys (left side) and
     keep both languages in sync: every key must exist in en AND de.
   - {name} is a placeholder that the game fills in, e.g. {n} = a number.
     Keep the placeholders, you may move them around in the sentence.
   - Keys ending in One / Other are singular / plural ("1 mistake", "2 mistakes").
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
      mistakes: 'Mistakes',
      labelDraw: 'Draw · {n}',
      labelDiscard: 'Discard · {n}',
      labelDone: 'Done · {k}/{total}',
      parkHere: 'Park here',             // empty discard pile
      empty: 'Empty',                    // empty field
      flipDiscard: 'Flip discard',       // button on the empty draw pile

      // Toasts
      toastWrong: 'Doesn’t fit',
      toastSolved: 'Solved!',
      toastCopied: 'Copied',
      toastCopyFailed: 'Could not copy',

      // Screen-reader labels (aria-label)
      ariaDraw: 'Draw pile: {word}',
      ariaDrawSelected: 'Draw pile: {word} (selected, tap again to discard)',
      ariaDiscardCard: 'Discard pile: {word}',
      ariaDiscardCardSelected: 'Discard pile: {word} (selected)',
      ariaDiscardOne: 'Discard pile, {n} card',
      ariaDiscardOther: 'Discard pile, {n} cards',
      ariaFlip: 'Flip discard pile into draw pile',
      ariaDone: 'Done pile, {k} of {total} categories. Show completed categories',
      ariaFieldEmpty: 'Field {f}, empty',
      ariaField: 'Field {f}, {k} of {max}: {words}',
      ariaStars: '{n} of 3 stars',

      // Result panel (replaces the fields when solved)
      solved: 'Solved!',
      mistakeCountOne: '{n} mistake',
      mistakeCountOther: '{n} mistakes',
      resultMeta: '{mistakes} · Streak {streak}',
      share: 'Share',
      nextPuzzle: 'Next puzzle in ',

      // Share text (one line each)
      shareStreak: 'Streak: {n}',

      // How-to modal
      helpTitle: 'How to play',
      help1: 'Draw a card and put it on a field.',
      help2: 'Each field collects one hidden category — {cards} cards completes it.',
      help3: 'Doesn’t fit? It bounces back and counts as a mistake.',
      help4: 'Park cards on Discard; when the draw pile runs out, flip the discard pile.',
      help5: 'Finish all {cats} categories.',
      helpTip: 'Drag a card, or tap a field to play the highlighted card. Tap the Discard card to pick it instead; tap the draw card again to park it.',
      helpDaily: 'A new puzzle every day at midnight.',
      play: 'Play',

      // Statistics modal
      statsTitle: 'Statistics',
      statSolved: 'Solved',
      statStreak: 'Current streak',
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

      mistakes: 'Fehler',
      labelDraw: 'Nachziehen · {n}',
      labelDiscard: 'Ablage · {n}',
      labelDone: 'Fertig · {k}/{total}',
      parkHere: 'Hier parken',
      empty: 'Leer',
      flipDiscard: 'Ablage umdrehen',

      toastWrong: 'Passt nicht',
      toastSolved: 'Gelöst!',
      toastCopied: 'Kopiert',
      toastCopyFailed: 'Kopieren ging nicht',

      ariaDraw: 'Nachziehstapel: {word}',
      ariaDrawSelected: 'Nachziehstapel: {word} (ausgewählt, nochmal tippen zum Ablegen)',
      ariaDiscardCard: 'Ablage: {word}',
      ariaDiscardCardSelected: 'Ablage: {word} (ausgewählt)',
      ariaDiscardOne: 'Ablage, {n} Karte',
      ariaDiscardOther: 'Ablage, {n} Karten',
      ariaFlip: 'Ablage umdrehen und zum Nachziehstapel machen',
      ariaDone: 'Fertig-Stapel, {k} von {total} Kategorien. Fertige Kategorien zeigen',
      ariaFieldEmpty: 'Feld {f}, leer',
      ariaField: 'Feld {f}, {k} von {max}: {words}',
      ariaStars: '{n} von 3 Sternen',

      solved: 'Gelöst!',
      mistakeCountOne: '{n} Fehler',
      mistakeCountOther: '{n} Fehler',
      resultMeta: '{mistakes} · Serie {streak}',
      share: 'Teilen',
      nextPuzzle: 'Nächstes Rätsel in ',

      shareStreak: 'Serie: {n}',

      helpTitle: 'So geht’s',
      help1: 'Zieh eine Karte und leg sie auf ein Feld.',
      help2: 'Jedes Feld sammelt eine geheime Kategorie – mit {cards} Karten ist sie komplett.',
      help3: 'Passt nicht? Dann springt sie zurück und zählt als Fehler.',
      help4: 'Park Karten auf der Ablage. Ist der Nachziehstapel leer, dreh die Ablage um.',
      help5: 'Schaff alle {cats} Kategorien.',
      helpTip: 'Zieh eine Karte aufs Feld oder tipp ein Feld an, um die markierte Karte zu spielen. Tipp die Ablage an, um ihre Karte zu nehmen; tipp die Nachziehkarte nochmal an, um sie zu parken.',
      helpDaily: 'Jeden Tag um Mitternacht gibt’s ein neues Rätsel.',
      play: 'Los geht’s',

      statsTitle: 'Statistik',
      statSolved: 'Gelöst',
      statStreak: 'Aktuelle Serie',
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
