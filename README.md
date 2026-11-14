# Riddle Me Rika

A daily card puzzle: draw cards and sort them onto 4 fields until all 6 hidden
categories are complete. Plain HTML/CSS/JS, no build step, works offline and
can be installed on the home screen.

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
| Symbols | `assets/symbols/<name>.png` (512 × 512), list in `SYMBOLS.md` |
| Design templates | `assets/templates/` |
| Categories and words | `categories.js` |
| Rules (fields, categories per game, cards per category) | top of `game.js` |
| App icon / name | `assets/icons/`, `manifest.webmanifest` |
| Layout | `style.css` |

Testing: add `?day=5` to the address to play another day's puzzle, `?reset=1` to restart today.
Saved games and stats live on each device (browser storage), they don't sync.
