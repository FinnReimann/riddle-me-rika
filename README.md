# Riddle Me Rika

A daily card puzzle: build a stack for each of 8 categories (category card +
its 4–7 word cards) before your moves run out. Plain HTML/CSS/JS, no build step,
works offline and can be installed on the home screen.

## Rules

- 8 categories per day. Each gets a number N from 4 to 7 (random per day and
  category): it has 1 category card + N word cards, and the category card
  shows N in a badge. So a day has 40–64 cards (usually around 52), dealt the
  same for everyone (seeded by the day).
- Board: Draw, Discard, Done in the top row; below 8 fields (4 × 2 on a phone,
  one row of 8 in landscape). The 4 top fields start empty; each of the 4
  bottom fields starts with 6 face-down cards. The other cards (16–40) are
  the draw pile; at least half of the category cards (4) are always in it.
- Tap a face-down card to turn it over (free) once nothing on that field is
  face up.
- **Runs:** onto a face-up card on a bottom field you can put word cards of
  its category (from Draw, Discard or another bottom field): onto a word card,
  or onto the category card itself, which then works as a stack right there
  (with all N words it is done and goes to Done). The face-up cards there form
  a run that always moves as a whole, for 1 move: a run of word cards onto its
  category stack or onto another bottom field's face-up card of the same
  category; a run with its category card only onto a free field (never onto
  Discard). Category cards never go onto a run. Once the run is gone (or
  done), the next face-down card can be turned. A bottom field becomes a free
  field only when it is completely empty.
- An empty field only accepts a category card. Word cards (and runs) go onto
  the stack whose category card matches. Category card + all its N words =
  done: the name shows briefly, the stack moves to Done and the field is empty
  again.
- **Discard:** the draw card can be parked there. A category card that lies
  alone on a field (no word cards on it yet) can be taken back onto Discard
  too (1 move; it can't move to another field). Category cards with words on
  them stay put. Bottom-field cards snap back with "Can't go to Discard"
  (free).
- Moves count down from the day's budget (cards + 20, e.g. 52 cards = 72
  moves). Every play costs 1 move: a card or a whole run onto a field, stack
  or run, a card onto Discard (also a taken-back category card). A wrong one
  is free: it bounces back ("Doesn't fit"). Turning
  cards, flipping the discard pile back into the empty draw pile, selecting
  and refused moves onto Discard are free too.
- All 8 done = solved; stars by moves used: ★★★ for at most cards + 6,
  ★★☆ for at most cards + 14, else ★☆☆. Moves at 0 before that = "Out of
  moves" (the streak breaks).
- **Restart** (↻ in the header): starts today's puzzle over from scratch (same
  cards, all moves back) after a confirmation. Only the first finished result
  of a day counts for the statistics and streak; a replay after that is a
  practice round ("Practice round – doesn't count").
- **Feedback:** correct plays pop and sparkle, runs land one after another,
  turned cards flip, wrong ones wobble, a completed category gets a confetti
  burst, and a win rains confetti. Small synthesized sounds go with it; switch them off in the
  how-to sheet ("Sound" / "Ton", saved on the device). With "reduce motion"
  on the phone, particles and shaking are left out. Tuning: `fx.js` (FX
  block) and the "Feedback" variables in `cards.css`.
- **Move ratings:** after every card play a label floats up where the card
  landed: **Perfect!** (Perfekt!) for one of the best moves (a word card / run
  onto its category stack, completing a category, or a category card while
  one of its words is visible; "Perfect ×3" for Perfects in a row), **Good**
  (Gut) for a useful move when a better one was there (building a run,
  moving a pile's category stack to a free field, a category card with none
  of its words visible, discarding when nothing perfect was there) and
  **Detour** (Umweg, small and friendly) for discarding or taking back a
  category card while a perfect move was there, or using the last free field
  for a category card while a perfect move was elsewhere. Turning cards and
  flipping the discard pile aren't rated, wrong moves just bounce. The result
  panel shows the tally ("12 Perfect · 5 Good · 2 Detour") and the share text
  adds "✨12 👍5 ↩︎2". The rules are `rateMove` in `game.js`.
- Controls: drag a playable card or run, or tap it (picks it; a run as a
  whole) and tap a field. The draw card is selected by default, so tapping a
  field plays it; tapping the draw card twice discards it. After picking a
  card, tapping a run of its category plays the card there; without a picked
  card, tapping a run picks that run. A lone category card: tap it (picks it,
  unless the selected card fits onto it - then that card is played there),
  then tap Discard or the card again to take it back; dragging it onto
  Discard works too.
- Every daily deal can be finished: see "Fair deals" below.

## Config (top of `game.js`)

| Constant | Value | Meaning |
|---|---|---|
| `CATEGORIES_PER_GAME` | 8 | categories per day |
| `MIN_CARDS_PER_CATEGORY` / `MAX_CARDS_PER_CATEGORY` | 4 / 7 | word cards per category: a seeded random N in this range per day and category (clamped to the category's pool, which must have at least 4) |
| `TOP_FIELDS` / `BOTTOM_FIELDS` | 4 / 4 | empty top fields / bottom fields with face-down cards |
| `FACE_DOWN_PER_FIELD` | 6 | face-down cards per bottom field (24 in all; the rest, 16–40, is the draw pile) |
| `MIN_CATEGORY_CARDS_IN_DRAW` | 4 (half of 8) | category cards always dealt into the draw pile |
| `MOVES_PER_CARD` / `MOVES_BASE` | 1 / 20 | day's move budget = cards × 1 + 20 (40 cards: 60, 64 cards: 84) |
| `STAR3_EXTRA` / `STAR2_EXTRA` | 6 / 14 | ★★★ / ★★☆ when finished in at most cards + this many moves (= 14 / 6 moves left) |
| `DEAL_SPARE` | 10 | a deal is only used if the solver finishes it with at least this many of the day's moves to spare |
| `DEAL_ATTEMPTS` | 200 | reshuffles tried per day before giving up (never needed more than 4) |
| `DEAL_HELP` | 0.75 | how often a dealt face-down card is one the solver can use right away (higher = friendlier deals) |
| `SYMBOL_DIR` + `SYMBOL_EXT` | `assets/symbols/`, `png` | the owner's symbols (always win) |
| `SYMBOL_GEN_DIR` + `SYMBOL_GEN_EXT` | `assets/symbols/generated/`, `svg` | generated fallback symbols |

### Fair deals

Because bottom cards can't be discarded, most random shuffles can't be
finished (a word card can sit above its own category card with nowhere to
go). So `game.js` has a solver: a greedy player that only looks at face-up
cards and the draw / discard pile, never at face-down cards. The deal
(`dealOrder`) fixes the draw pile first (with at least 4 category cards), then
lets the solver play and decides each face-down card only when the solver
turns it (with chance `DEAL_HELP` among the cards it can use right away).
Because the solver never peeks, replaying it on the finished deal gives the
same game; `buildGame` checks exactly that within the budget minus `DEAL_SPARE` and
otherwise deals again with a seed derived from the day. Everyone gets the same
deal; it takes about 0.1 ms (at most ~2 ms) on a laptop.

The budget was calibrated with the solver over 2000 daily deals (days
0–1999, 41–63 cards a day, median 52): the solver needs its card count
−1 to +10 moves on the deals it accepts (median +5, 90% within +8; with 6
face-down cards the draw pile is bigger, so there is more cycling), almost
the same for small and big days, so the budget is cards + 20 and the stars
count moves above the card count. 190 days needed a reshuffle (at most 3).
The solver always has at least 10 moves to spare and gets ★★★ on 79% of days,
★★☆ on the rest; other careful styles get ★★★ on about 60% of the days.
Wrong moves are free, which doesn't change these numbers (the solver never
makes one). Other sensible play styles (using the take-back when stuck)
finish about 89–92% of days within the budget when they put down useful
category cards first, 89% when they pick category cards at random, and 23%
when they ignore runs. When they get stuck, every
field holds a stack that already has word cards, or a field is free but no
category card can be reached. (With 3 + 3 fields this was 42–60% without the
moves limit, which is why there are 4 + 4.)
If you change the field / card numbers, the layout in `style.css`
(`--field-cols`, `--field-rows`, `--stack-n`) has to match (long stacks and runs get thinner strips automatically; on tall screens the spare height makes the strips taller, up to `--stack-ratio-max` in `cards.css`), and the budget
should be re-checked. Changing the rules makes old saves invalid; they are
simply replaced by a new game.

## Put it online with GitHub Pages (once)

1. Create a new **public** repository on github.com, e.g. `riddle-me-rika`
   (no README, no .gitignore – this folder already has them).
2. In this folder, connect and upload:

   ```bash
   git remote add origin https://github.com/<your-name>/riddle-me-rika.git
   git push -u origin main
   ```

3. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   Branch **main**, folder **/ (root)**, Save.
4. After a minute the game is live at
   `https://<your-name>.github.io/riddle-me-rika/`.

Nobody needs an account to play.

## Install on iPhone

Open the link in **Safari → Share → Add to Home Screen**. The game then starts
full screen (bigger cards, no Safari bars) and works offline.

## Updating

Change files, then:

```bash
git add -A
git commit -m "Describe the change"
git push
```

GitHub Pages republishes automatically. Installed apps pick up the new files on
their next start (they load from the offline copy first, then refresh it). For a
big change, bump `CACHE_VERSION` in `sw.js` so every device drops its old copy.

## Where things are

| What | File |
|---|---|
| Card look (colours, fonts, zones, images) | `cards.css`, guide in `CARD-DESIGN.md` |
| Card images | `assets/card-face.png`, `assets/card-back.png` (750 × 1050) |
| Symbols | `assets/symbols/<name>.png` (512 × 512), list in `SYMBOLS.md`; generated fallbacks in `assets/symbols/generated/<name>.png` (rendered from the `.svg` sources there) |
| Design templates | `assets/templates/` |
| Affinity files, sketches (local only, not in git) | `designer/` |
| Categories and words (English `word`/`theme`, German `wordDe`/`themeDe`) | `categories.js` |
| All other texts (buttons, help, toasts, share text), English + German | `i18n.js` |
| Language button icon | `assets/icons/lang.png` (96 × 96, transparent; see below) |
| Rules (fields, categories per game, cards per category, moves, stars) | top of `game.js` |
| App icon / name | `assets/icons/`, `manifest.webmanifest` |
| Layout | `style.css` |

## Languages (English / German)

The button left of `?` switches between English and German instantly (the
game keeps going). The choice is saved on the device; on the first visit the
game uses German if the phone is set to German, otherwise English.

- Texts: `i18n.js` has one block per language (`en`, `de`) with the same keys.
  Change the text on the right, keep `{placeholders}`.
- Card words / category names: `wordDe` / `themeDe` in `categories.js`
  (falls back to English if missing). For very long category names you can
  add a soft hyphen `­` where the word may break, e.g.
  `"Musik­instrumente"` (shows as MUSIK- / INSTRUMENTE on small cards).
- Icon: draw **`assets/icons/lang.png`**, 96 × 96 px, transparent PNG (shown at
  26 × 26 CSS px in a 44 px round button). The game puts a small badge with the
  current language ("EN" / "DE") on its bottom-right corner, so keep that
  corner fairly empty. Without the file the button just shows "EN" / "DE".

## Symbols

Each card first tries `assets/symbols/<symbol>.png`, then the generated
`assets/symbols/generated/<symbol>.png` (rendered from the `.svg` sources there), then a placeholder. To use your own
drawing, drop your PNG into `assets/symbols/` with the same name and it
replaces the generated SVG automatically. Category cards use
`category-<categoryId>` (e.g. `category-fruit.png`).

Testing: add `?day=5` to the address to play another day's puzzle, `?reset=1` to restart today.
Saved games and stats live on each device (browser storage), they don't sync.
