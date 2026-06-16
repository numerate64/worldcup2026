# World Cup 2026

Static FIFA World Cup 2026 schedule, scores, points, bracket, favorites, and export page for GitHub Pages.

Published page:

```text
https://numerate64.github.io/worldcup2026/
```

## What Is Happening

This repository publishes a single-page World Cup tracker. The page loads `world-cup-2026.json` in the browser, renders the tournament schedule, and lets the visitor move between four views:

- **Schedule** - all 104 matches with Eastern kickoff times, stage, group, venue, location, search, filters, and local favorites.
- **Scores** - the same match list with status and score text when the JSON contains final scores.
- **Points** - live group tables computed in the browser from completed group-stage scores.
- **Bracket** - knockout fixtures plus a current group qualification snapshot once group results exist.

The browser also provides:

- Favorites stored locally in `localStorage`; they are not synced anywhere.
- Refresh button that reloads `world-cup-2026.json` without using the browser cache.
- CSV, XLS, and ICS exports for the currently filtered match list.
- A Data Check card that flags matches that are past the expected final-score window but still have no score in the data file.

## Current Data State

As of the checked-in `world-cup-2026.json`:

- `updatedAt`: `2026-06-16T15:15:42.925Z`
- `sourceUpdated`: `2026-06-16`
- Total matches: `104`
- Final scores currently present: `16`
- Tournament structure:
  - Group Stage: `72`
  - Round of 32: `16`
  - Round of 16: `8`
  - Quarterfinals: `4`
  - Semifinals: `2`
  - Third Place: `1`
  - Final: `1`

Final scores currently included:

| Match | Date | Result |
| --- | --- | --- |
| M001 | June 11, 2026 | Mexico 2-0 South Africa |
| M002 | June 11, 2026 | South Korea 2-1 Czech Republic |
| M007 | June 12, 2026 | Canada 1-1 Bosnia & Herzegovina |
| M008 | June 13, 2026 | Qatar 1-1 Switzerland |
| M013 | June 13, 2026 | Brazil 1-1 Morocco |
| M014 | June 13, 2026 | Haiti 0-1 Scotland |
| M019 | June 12, 2026 | USA 4-1 Paraguay |
| M020 | June 14, 2026 | Australia 2-0 Turkey |
| M025 | June 14, 2026 | Germany 7-1 Curaçao |
| M026 | June 14, 2026 | Ivory Coast 1-0 Ecuador |
| M031 | June 14, 2026 | Netherlands 2-2 Japan |
| M032 | June 14, 2026 | Sweden 5-1 Tunisia |
| M037 | June 15, 2026 | Belgium 1-1 Egypt |
| M038 | June 15, 2026 | Iran 2-2 New Zealand |
| M043 | June 15, 2026 | Spain 0-0 Cabo Verde |
| M044 | June 15, 2026 | Saudi Arabia 1-1 Uruguay |

## Data Pipeline

The canonical upstream source is:

```text
https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json
```

The sync script is `scripts/sync-worldcup-openfootball.js`.

When it runs, it:

1. Fetches the upstream openfootball JSON.
2. Reads the existing local `world-cup-2026.json`.
3. Preserves existing venue and location metadata where possible.
4. Converts source kickoff times into Eastern Time.
5. Normalizes a small set of team names and aliases, such as Cabo Verde/Cape Verde, Turkiye/Turkey, Czechia/Czech Republic, and DR Congo.
6. Maps upstream rounds into the display stages used by the site.
7. Copies final scores, halftime scores, and goal data when upstream provides them.
8. Writes a fresh `world-cup-2026.json`.

Run the sync manually with:

```sh
npm run sync:worldcup
```

## GitHub Actions

There are two workflows:

- `.github/workflows/sync-worldcup.yml`
  - Runs hourly at minute 23 and can also be started manually.
  - Runs `npm run sync:worldcup`.
  - Commits `world-cup-2026.json` only when the generated data changes.
  - Deploys GitHub Pages when a data change was committed.

- `.github/workflows/pages.yml`
  - Deploys GitHub Pages on pushes to `main` that touch the page, styles, script, data file, or workflow.
  - Can also be started manually.

## Files

- `index.html` - page structure and view containers.
- `styles.css` - visual styling for the tracker.
- `soccer.js` - browser rendering, filters, favorites, points, bracket, refresh, and exports.
- `world-cup-2026.json` - generated schedule/results payload used by the page.
- `scripts/sync-worldcup-openfootball.js` - upstream sync and transform script.
- `package.json` - exposes `npm run sync:worldcup`.

## Important Limits

- openfootball is hand-maintained and may trail live match results.
- This site does not call a live sports API from the browser; it only reloads the checked-in JSON file.
- Points and bracket snapshots are computed from the scores present in `world-cup-2026.json`, so they are only as current as the last successful sync.
- Favorites are browser-local and disappear if the visitor clears site storage.
