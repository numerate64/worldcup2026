# World Cup 2026

Static FIFA World Cup 2026 schedule, scores, points, bracket, favorites, and export page for GitHub Pages.

## Published Page

```text
https://numerate64.github.io/worldcup2026/
```

## What Is Happening

This repository publishes a single-page World Cup tracker. The page loads `world-cup-2026.json` in the browser and renders Schedule, Scores, Points, and Bracket views.

The browser also provides favorites in `localStorage`, no-cache data refresh, CSV/XLS/ICS exports, and a data-check card for stale missing scores.

## Current Data State

As of the checked-in `world-cup-2026.json`:

- `updatedAt`: `2026-06-17T00:26:03.076Z`
- `sourceUpdated`: `2026-06-16`
- Total matches: `104`
- Final scores currently present: `17`

## Data Pipeline

The sync script is `scripts/sync-worldcup-openfootball.js`. It fetches openfootball data, preserves local venue/location metadata where possible, normalizes team names, copies final scores when available, and writes `world-cup-2026.json`.

```sh
npm run sync:worldcup
```

## Files

- `index.html` - page structure and view containers.
- `styles.css` - visual styling for the tracker.
- `soccer.js` - browser rendering, filters, favorites, points, bracket, refresh, and exports.
- `world-cup-2026.json` - generated schedule/results payload.
- `scripts/sync-worldcup-openfootball.js` - upstream sync and transform script.
- `package.json` - exposes `npm run sync:worldcup`.
