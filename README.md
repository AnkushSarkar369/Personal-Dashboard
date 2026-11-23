# Habit Radar

A focused, local-first habit tracker built with plain HTML, CSS and JavaScript. No framework, build process, localhost server, account or external runtime dependencies.

## Run

Open `index.html` in a modern browser. Keep `styles.css` and `app.js` beside it. The layout adapts to desktop and mobile screens.

The app starts with an editable sample workspace. Browser storage is used automatically where available. Use **Settings & Data → Export JSON** for backups and **Import JSON** to restore them. Optional folder saving uses the File System Access API in compatible desktop browsers; it is not required.

## Included

- A visual Overview with a dimension-coloured radar chart.
- Editable dimensions and a Habit Library with compact dimension cards.
- Habit creation and editing, including multi-dimension point allocations.
- Completed, Minimum Viable Action (MVA), and Not Completed daily states.
- A configurable MVA multiplier; historical records preserve the multiplier and point values used on that day.
- Daily tracking with habit reordering and historical record review.
- 1M, 3M and All Time statistics, including weekday distribution, habit spotlight, leaders and daily archive.
- Activate or deactivate habits without deleting their historical activity.
- JSON backup and restore, sample-workspace restore, and full data reset.

## Storage

The current workspace is stored in browser localStorage. Export JSON backups periodically, especially before resetting browser data or moving to another device. Imported backups are checked for basic structural integrity before replacing the current workspace.

## Files

- `index.html` — application structure
- `styles.css` — visual system and responsive layout
- `app.js` — data model, tracking, rendering, statistics and persistence
