# Sunset Strip Cover Studio

[![make.fun bounty](https://img.shields.io/badge/make.fun-bounty-ff5da2)](https://make.fun/bounty/gta6-cover-art-01)
[![Free](https://img.shields.io/badge/price-free-22d3ee)](https://make.fun/bounty/gta6-cover-art-01)
[![Offline](https://img.shields.io/badge/offline-yes-ffd166)](https://make.fun/bounty/gta6-cover-art-01)

Entry for the [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01) bounty ($250) — a web app that turns your photos into a multi-panel GTA-style poster cover, exported as a PNG to share.

## What it does

- **6 panel layouts** — Hero + Strip, Comic 4-Panel, Triptych, 2×2 Grid, Duo Split, Full-Bleed Hero
- **6 gradient-map colour grades** — Vice Sunset, Neon Nights, Palm Dusk, Heat Haze, Noir, Bubblegum
- **Halftone comic-dot shading** + thick-outline caption with a hard drop shadow — the comic-book look the other cover studios don't have
- **Up to 4 photos** — one photo can fill several panels, or several photos across the panels; drag to reposition, zoom slider per panel
- **Editable caption + sub-caption**, live preview, one-click PNG export in **1080×1080, 1080×1350, 1920×1080**
- **Fully offline** — static files under `app/`, no build step, no network requests; photos are read on your machine and never uploaded

## How to use it

1. Open `app/index.html` in desktop Chrome (or serve `app/` with any static server).
2. Add your photos, or tap a sample to try it instantly.
3. Pick a layout and a grade, write your caption.
4. Click a panel in the preview and drag it to reposition its photo; use the zoom slider to crop tighter.
5. Hit **Export PNG cover** — done in one click, no watermark.

## What makes it different

Most cover makers on the leaderboard are flat neon posters. Sunset Strip is drawn like a comic book: a real gradient-map grade (shadow → midtone → highlight lookup per grade), halftone dots over the whole cover, white comic gutters with inked panel frames, and a tilted Anton caption with a thick outline and hard shadow. The exported PNG is the same canvas the editor draws — what you see is what you post.

## Originality

All code, layout, grades and sample illustrations are original, made for this entry. No Rockstar Games logo, wordmark, artwork, character or font is used anywhere. Fonts are **Anton** and **Inter**, both under the SIL Open Font License — the files live under `app/fonts/` with the license text in `app/fonts/OFL.txt`. Sample photos are original illustrations generated for this app.

## Files

- `app/index.html` — the app shell
- `app/style.css` — dark neon editor UI
- `app/src/cover.js` — cover renderer: layouts, grades, halftone, caption
- `app/src/main.js` — editor wiring: photos, drag-to-crop, export
- `app/src/shots.js` — `?shot=` scenes used to take the entry screenshots
- `app/fonts/` — Anton + Inter (OFL)
- `app/samples/` — 4 sample images (original illustrations / kit samples)
- `main.ts` — hands the app + screenshots to `/output` with `dossier.json`
