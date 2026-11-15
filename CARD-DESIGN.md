# Designing the cards

All card visuals live in **`cards.css`** (cards, piles, fields, tier colours,
states). `style.css` only does layout and computes the card size from the
screen; `game.js` never sets visual styles. `cards.css` loads last, so it wins.

## Preview

- Serve the folder (any static server) or open `index.html`.
- `?day=5` shows puzzle #6 (does not count towards stats); `?reset=1` restarts
  the shown day (`?day=5&reset=1`).
- Test at iPhone SE (375 x 667 and 375 x 548), iPhone 15 (393 x 852) and a
  Pro Max (430 x 932), light and dark. A field must hold a full stack of 5
  cards (category card + 4 words); on screens under 600 px tall
  `--stack-ratio` drops to 0.19 so it still fits without scrolling.

## Variables (top of `cards.css`)

| Group | Variables |
| --- | --- |
| Size & shape | `--card-ratio` (height / width, 1.4 = 5:7), `--card-max-w`, `--card-radius`, `--card-border`, `--card-shadow` |
| Field stacking | `--stack-ratio` (visible strip of a covered card, fraction of card height; 0.19 on short screens), `--stack-offset` (derived), `--down-offset` (step between face-down cards on a bottom field), `--pile-offset` (peek of cards under a pile) |
| Face | `--card-bg`, `--card-face-image`, `--card-face-image-size` |
| Word (top) | `--word-font`, `--word-size`, `--word-weight`, `--word-color`, `--word-tracking`, `--word-transform`, `--word-top`, `--word-inset` |
| Symbol (lower part) | `--symbol-top`, `--symbol-bottom`, `--symbol-inset` |
| Placeholder | `--placeholder-size`, `-bg`, `-border`, `-radius`, `-color`, `-font`, `-font-size` |
| Back (draw pile) | `--card-back-bg`, `--card-back-pattern`, `--card-back-image`, `--card-back-border` |
| Category card | `--category-card-bg`, `--category-card-image`, `--category-card-ink`, `--category-card-border-w`, `--category-band-h`, `--category-name-font`, `--category-name-size`, `--category-name-weight`, `--category-name-transform`, `--category-name-tracking` |
| Face-down cards (bottom fields) | `--turn-ring`, `--turn-badge-bg`, `--turn-badge-ink` (ring + ↻ badge on the card you can turn) |
| Empty piles / flip | `--slot-*`, `--flip-*` |
| Fields | `--field-bg`, `--field-border`, `--field-radius`, `--field-hint` |
| States | `--selected-ring`, `--selected-lift`, `--drop-ring`, `--drop-bg`, `--wrong`, `--wrong-bg`, `--correct`, `--correct-bg`, `--ghost-*`, `--drag-source-opacity` |
| Tiers | `--tier-1` ... `--tier-4` and `--tier-N-ink` (completed-field label, Done pile, Completed sheet) |
| Done pile | `--done-font-size`, `--done-under-bg` |

Sizes scale with the card via `--card-w` / `--card-h`, e.g.
`calc(var(--card-w) * 0.15)`. The layout uses `--card-ratio` and
`--stack-ratio` to make everything fit one screen, so change those two rather
than hard-coding card heights. Words up to 15 letters fit (English or German,
whichever is shown); `data-len` (s ≤7, m ≤9, l ≤11, xl ≤13, xxl 14+) shrinks
longer words. Category names on the Done pile and the completed-field label
get `data-len` from their longest word (s ≤9, l 10–12, xl 13+), shrink a bit
and hyphenate (`hyphens: auto` + `<html lang>`; soft hyphens `­` in
`themeDe` give a clean break in every browser).

Every colour is defined three times: light (`:root`), dark when the system is
dark, and dark when forced with `<html data-theme="dark">`. Edit **both** dark
blocks.

## Category cards

Every category has one **category card** (8 per game). It is always the
bottom card of a stack, so it can only go on an empty field. It looks
different from word cards: its own background (`--category-card-bg`, no face
image unless you set `--category-card-image`), a border and a band at the top
in the tier colour, and the category name (German `themeDe` when German is
on) larger, uppercase and centred in the band. The band stays visible when the
card is covered, so keep `--category-band-h` close to `--stack-ratio`.
Long names shrink (`data-len` l / xl) and break at soft hyphens.
Its symbol is `assets/symbols/category-<categoryId>.png` (e.g.
`category-fruit.png`; list in `SYMBOLS.md`). Styles: the "Category card"
section of `cards.css`.

## Symbols

Each card shows a symbol, where `<symbol>` is the card's `symbol` id in
`categories.js` (see **`SYMBOLS.md`** for the list and art guidelines).
The game tries, in order:

1. `assets/symbols/<symbol>.png` – your own drawing (always wins),
2. `assets/symbols/generated/<symbol>.svg` – generated fallback,
3. `.card__placeholder` (dashed square with the word's initial).

So: drop your PNG into `assets/symbols/` with the same name and it replaces
the generated SVG automatically. Folders and extensions are the
`SYMBOL_DIR` / `SYMBOL_EXT` and `SYMBOL_GEN_DIR` / `SYMBOL_GEN_EXT`
constants at the top of `game.js`. Transparent square images work best; they
are scaled with `object-fit: contain` into the symbol area.

## Card face / back images

Put files in `assets/` and set e.g.
`--card-face-image: url("assets/card-face.png");` or
`--card-back-image: url("assets/card-back.png");` (drawn with `cover` over the
background colour; aim for a 5:7 image).

## Classes (stable, set by the game)

| Class | Element |
| --- | --- |
| `.card`, `.card__word`, `.card__art`, `.card__symbol`, `.card__placeholder` | A face-up card and its parts |
| `.card--back` / `.card--under` / `.card--done-under` | Cards under the draw / discard / done top card (`--i` = depth) |
| `.card--done` + `.tier-N`, `.done__theme`, `.done__count` | Done pile top |
| `.card--empty`, `.card__hint` | Empty pile |
| `.card--field` | Card in a field stack (`--i` = stack position 0..4, 0 = category card) |
| `.card--category` + `.tier-N`, `.card__catname` | Category card and its name |
| `.card--down` (`.is-turnable`), `.card--down-top` | Face-down cards on a bottom field (the top one can be turned), face-up top card there |
| `.card.is-top`, `.is-selected`, `.is-new`, `.is-bounce`, `.is-drag-source` | Playable / selected / just placed / rejected tap / being dragged |
| `.card-ghost` (`.is-returning`), `.card-flying` | Dragged copy, copies flying to Done |
| `.pile--draw`, `.pile--discard`, `.pile--done`, `.pile__flip` | Top-row piles, "Flip discard" button |
| `.field` (`.field--top`, `.field--bottom`, `.field--pile`, `.is-empty`, `.is-complete`, `.is-wrong`, `.is-correct`, `.is-drop-target`) | Fields (`.field--pile` = bottom field still holding dealt cards) and their states |
| `.field__hint`, `.field__reveal`, `.field__theme` | Field texts; theme label on completion |
| `.done-list__item` | Row in the Completed sheet |

## Image sizes and templates

Templates (SVG to edit, PNG to trace over) are in `assets/templates/`.

| File | Size | Notes |
|---|---|---|
| `assets/card-face.png` | 750 × 1050 px (5:7) | Background behind the word and symbol. Keep the word zone (y 55–195) and symbol area (x 90–660, y 315–966) calm. Only the top 241 px (23%) shows when a card is covered in a field. |
| `assets/card-back.png` | 750 × 1050 px (5:7) | Draw pile and the face-down cards on the bottom fields (there a ↻ badge sits in the lower middle of the top card). Full bleed is fine; keep logos/text 45 px from the edge. |
| `assets/symbols/<name>.png` | 512 × 512 px, transparent | Scaled to fit the symbol area (570 px on a 750 px card, about 60–90 px on a phone). Keep 40 px padding. |
| `assets/icons/lang.png` | 96 × 96 px, transparent | Language button in the header (one icon for both languages), shown at 26 × 26 CSS px inside the 44 px round button. A small "EN" / "DE" badge (current language) sits on the button's bottom-right, so keep that corner light. Missing file = the button shows just "EN" / "DE". Styles: `.lang-btn`, `.lang-btn__icon`, `.lang-btn__text` in `style.css`. |

Corners are cut round (radius = 9% of the width, 67.5 px at 750 px). The card is shown at most 132 CSS px wide, so 750 px covers 3× retina screens with room to spare.
If you change `--card-ratio`, `--symbol-*` or `--word-*` in `cards.css`, the zones in the templates move too.
