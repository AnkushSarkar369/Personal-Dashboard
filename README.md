# Habit Radar

A focused, portable habit tracker built with plain HTML, CSS and JavaScript. No framework, build process, localhost server, AppImage, account or external assets.

## Run

Open `index.html` in a modern browser. Keep `styles.css` and `app.js` beside it. Core tracking works on desktop and mobile browsers; layout adapts to narrow screens.

The app starts with editable sample dimensions, pools and habits so the interface is populated immediately. Use Settings & data → Export JSON for backups and Import JSON to restore them. Browser storage is used automatically where available. Optional folder saving uses the File System Access API in compatible desktop browsers; it is not required.

## Included

- Editable dimensions, pools, habits and multi-dimension point allocations.
- Central Habit Configuration panel; no scattered edit dialogs.
- Completed, MVA and Not completed daily states.
- Global MVA multiplier; historical records preserve the multiplier and point values from the day.
- Independent dimension ledgers, 1M / 3M / cumulative statistics and radar chart.
- Archive and restore habits without deleting historical activity.
- Sample data can be edited, archived or deleted.

## Files

- `index.html` — structure
- `styles.css` — visual system and responsive layout
- `app.js` — data model, tracking, rendering and persistence
