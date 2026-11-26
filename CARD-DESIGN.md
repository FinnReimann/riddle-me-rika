# Designing the cards

All card visuals live in **`cards.css`** (cards, piles, fields, tier colours,
states). `style.css` only does layout and computes the card size from the
screen; `game.js` never sets visual styles. `cards.css` loads last, so it wins.

## Preview

- Serve the folder (any static server) or open `index.html`.
- `?day=5` shows puzzle #6 (does not count towards stats); `?reset=1` restarts
  the shown day (`?day=5&reset=1`).
- Test at iPhone SE (375 x 667 and 375 x 548), iPhone 14/15 Pro (393 x 852,
  and 393 x 660 = Safari with its bars) and a Pro Max (430 x 932), light and
  dark. Installed to the home screen the safe areas (59 px top for the Dynamic
  Island, 34 px bottom) come from `--safe-top` / `--safe-bottom` in
  `style.css`; set them to 59px / 34px temporarily to preview that. A field must hold a full stack of up
  to 8 cards (category card + 7 words); the room is `--stack-n` strips, and
  longer stacks / runs get thinner strips automatically (`style.css`). On
  screens under 600 px tall `--stack-ratio` drops to 0.19.

## Variables (top of `cards.css`)

| Group | Variables |
| --- | --- |
| Size & shape | `--card-ratio` (height / width, 1.4 = 5:7), `--card-max-w`, `--card-radius`, `--card-border`, `--card-shadow` |
| Field stacking | `--stack-ratio` (visible strip of a covered card, fraction of card height; 0.19 on short screens), `--stack-ratio-max` (on tall screens, e.g. iPhone 14 Pro, the spare height makes strips taller, up to this; default 0.34), `--stack-offset` (derived, between the two; also the offset of run cards on a bottom field), `--down-offset` (step between face-down cards on a bottom field; squeezed automatically under a long run so a run of 4 on 7 face-down cards still fits), `--pile-offset` (peek of cards under a pile) |
| Face | `--card-bg`, `--card-face-image`, `--card-face-image-size` |
| Word (top) | `--word-font`, `--word-size`, `--word-weight`, `--word-color`, `--word-tracking`, `--word-transform`, `--word-top`, `--word-inset` |
| Symbol (lower part) | `--symbol-top`, `--symbol-bottom`, `--symbol-inset` |
| Placeholder | `--placeholder-size`, `-bg`, `-border`, `-radius`, `-color`, `-font`, `-font-size` |
| Back (draw pile) | `--card-back-bg`, `--card-back-pattern`, `--card-back-image`, `--card-back-border` |
| Counter "x/y" | `--counter-font-size`, `--counter-font-weight`, `--counter-bg`, `--counter-ink`, `--counter-top`, `--counter-left`, `--counter-shift` (top-left chip on the topmost card of a stack; on a category card it sits below the band, on a word card the word moves down by `--counter-shift`) |
| Tuck under | `--tuck-bg`, `--tuck-ink` (the ⤓ button below a bottom field's run) |
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

## Feedback ("bling")

- CSS animations live in `cards.css`: the "Feedback" variables in `:root`
  (`--fx-pop-ms`, `--fx-stagger`, `--fx-glow`, `--fx-flip-ms`,
  `--fx-nope-ms`, `--fx-celebrate-glow`, `--fx-theme-scale`,
  `--fx-perfect-*`, `--fx-good-*`, `--fx-detour-*`, `--fx-rating-size`, `--fx-star-*`) and the "Feedback" section below them
  (`.is-new` pop + squash with stagger, `.is-flip` 3D flip, `.is-nope`
  wobble, `.is-glow`, `.is-celebrate`, `.fx-rating` move ratings, result stars).
- Particles, confetti and sounds: the `FX` block at the top of `fx.js`
  (colours, counts, speeds, gravity, volume, Perfect chime pitch, rating sizes and duration).
- `prefers-reduced-motion`: no particles, confetti, shaking or flips; simple
  fades only. Sounds still play (switch in the how-to sheet).

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
2. `assets/symbols/generated/<symbol>.png` (rendered from the `.svg` sources there) – generated fallback,
3. `.card__placeholder` (dashed square with the word's initial).

So: drop your PNG into `assets/symbols/` with the same name and it replaces
the generated SVG automatically. Folders and extensions are the
`SYMBOL_DIR` / `SYMBOL_EXT` and `SYMBOL_GEN_DIR` / `SYMBOL_GEN_EXT`
constants at the top of `game.js`. Transparent square images work best; they
are scaled with `object-fit: contain` into the symbol area.

## Category looks (personality)

A category in `categories.js` can have `look: "<name>"`. All its cards then get
the class `.look-<name>` (font of the word etc.), and its word cards WITHOUT a
`symbol` become text cards (`.card--text`): the symbol area shows `.card__mono`,
a badge with the word's first letter (look `hello`: the whole word in a speech
bubble). Right now every card has a symbol, so only the font part of the look
shows; the badge is the fallback for a card whose `symbol` you remove.
Styles are in the "Category looks" section of `cards.css`:

| look | category | style |
|---|---|---|
| `fashion` | High Fashion | Playfair Display caps, black monogram |
| `airlines` | Airlines | bold italic caps, blue tail fin |
| `cars` | Car Brands | heavy italic caps, chrome badge |
| `hello` | Saying Hello | Caveat handwriting, pink speech bubble |
| `dances` | Dances | italic serif, rose medallion |
| `gods` | Gods of Myth | Cinzel, gold medallion |
| `cheese` | Cheese | cheese wedge with holes |
| `capitals` | European Capitals | pictures (landmarks), no extra style yet |

New look: add `look` in `categories.js` and a `.look-<name>` block in `cards.css`.
Extra fonts go into the Google Fonts link in `index.html`.

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
| `.card--lone` | A category card alone on its field (also `.card--field.is-top`): playable, it can be taken back onto Discard |
| `.card--category` + `.tier-N`, `.card__catname` | Category card and its name |
| `.card__counter`, `.card.has-counter` | "x/y" chip on the topmost card of a stack (and on a category card on Draw / Discard) |
| `.tuck-btn` (`.is-hint`), `.tuck-btn__icon`, `.tuck-btn__cost` | ⤓ "tuck under" button below a selected run (pulsing as a hint when nothing else helps) |
| `.card--down` (`.is-turnable`) | Face-down cards on a bottom field (`--i` = depth; the top one can be turned while nothing is face up) |
| `.card--run`, `.card--down-top` | Face-up run on a bottom field (`--r` = position in the run; one card, or up to 4 word cards of one category that move together); `.card--down-top` = its topmost card |
| `.card.is-top`, `.is-selected`, `.is-new`, `.is-bounce`, `.is-drag-source` | Playable / selected / just placed / rejected tap / being dragged (all cards of a run get these together) |
| `.card-ghost` (`.is-returning`), `.card-ghost-run` + `.card-ghost-run__card`, `.card-flying` | Dragged copy of one card, of a whole run, copies flying to Done |
| `.pile--draw`, `.pile--discard`, `.pile--done`, `.pile__flip` | Top-row piles, "Flip discard" button |
| `.field` (`.field--top`, `.field--bottom`, `.field--pile`, `.has-run`, `.is-empty`, `.is-complete`, `.is-wrong`, `.is-correct`, `.is-drop-target`) | Fields (`.field--pile` = bottom field still holding cards, `.has-run` = with 2+ face-up cards) and their states |
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
