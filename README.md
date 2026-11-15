# Riddle Me Rika

A daily card puzzle: build a stack for each of 8 categories (category card +
4 word cards) before your moves run out. Plain HTML/CSS/JS, no build step,
works offline and can be installed on the home screen.

## Rules

- 40 cards per day: 8 categories × (1 category card + 4 word cards), dealt the
  same for everyone (seeded by the day).
- Board: Draw, Discard, Done in the top row; below 6 fields. The 3 top fields
  start empty; each of the 3 bottom fields starts with 10 face-down cards (a
  quarter of the deck each). The last 10 cards are the draw pile.
- Tap a face-down card to turn it over (free). Only the top card of a bottom
  field can be face up; it is playable like the draw / discard card. Nothing
  can be placed onto a bottom field while it still has cards; once empty it is
  a free field like the top ones.
- An empty field only accepts a category card. Word cards go onto the stack
  whose category card matches. Category card + 4 words = done: the name shows
  briefly, the stack moves to Done and the field is empty again.
- Moves count down from the budget. Every card play costs 1 move: onto a stack,
  onto Discard, and also a wrong one (it bounces back, "Doesn't fit").
  Turning cards, flipping the discard pile back into the empty draw pile and
  selecting are free.
- All 8 done = solved; stars by moves left. Moves at 0 before that = "Out of
  moves" (the streak breaks).
- Controls: drag a playable card, or tap it (selects) and tap a field. The draw
  card is selected by default. Tapping the selected card again discards it.

## Config (top of `game.js`)

| Constant | Value | Meaning |
|---|---|---|
| `CATEGORIES_PER_GAME` | 8 | categories per day |
| `CARDS_PER_CATEGORY` | 4 | word cards per category |
| `TOP_FIELDS` / `BOTTOM_FIELDS` | 3 / 3 | empty top fields / bottom fields with face-down cards |
| `FACE_DOWN_PER_FIELD` | 10 | face-down cards per bottom field |
| `MOVES` | 85 | move budget |
| `STAR3_LEFT` / `STAR2_LEFT` | 20 / 8 | moves left needed for ★★★ / ★★☆ |
| `SYMBOL_DIR` + `SYMBOL_EXT` | `assets/symbols/`, `png` | the owner's symbols (always win) |
| `SYMBOL_GEN_DIR` + `SYMBOL_GEN_EXT` | `assets/symbols/generated/`, `svg` | generated fallback symbols |

The budget was calibrated with a greedy auto-player over 2000 daily deals: it
needs 45–78 moves (median 58), so 85 always leaves moves to spare; ★★★ means
finishing in 65 moves or less. If you change the field / card numbers, the
layout in `style.css` (`--field-cols`, `--field-rows`, `--stack-n`) has to
match, and the budget should be re-checked. Changing the rules makes old saves
invalid; they are simply replaced by a new game.

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
| Symbols | `assets/symbols/<name>.png` (512 × 512), list in `SYMBOLS.md`; generated fallbacks in `assets/symbols/generated/<name>.svg` |
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
`assets/symbols/generated/<symbol>.svg`, then a placeholder. To use your own
drawing, drop your PNG into `assets/symbols/` with the same name and it
replaces the generated SVG automatically. Category cards use
`category-<categoryId>` (e.g. `category-fruit.png`).

Testing: add `?day=5` to the address to play another day's puzzle, `?reset=1` to restart today.
Saved games and stats live on each device (browser storage), they don't sync.
