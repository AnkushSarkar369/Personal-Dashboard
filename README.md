# Habit Radar

A focused, portable habit tracker built with plain HTML, CSS and JavaScript. No framework, package manager, build step, localhost server, AppImage or account.

## Run

Double-click index.html (or open it in a modern browser).

For automatic folder-based persistence, use a Chromium-based browser and open Settings & data → Choose data folder. Select a folder inside or beside the application directory. Habit Radar writes habit-radar.json directly into that folder.

Move the selected data folder with the application. On another computer, open the app and reconnect the folder once. Browsers restrict silent file writes, so explicit folder permission is required.

If the browser does not support the File System Access API, use Export JSON and Import JSON. This is a complete backup.

## Product model

- Everything is editable: dimensions, pools, habits, point allocations and active configuration.
- Habits can contribute to multiple dimensions.
- Completed earns 100%; MVA earns the global multiplier (default 0.25×); Not completed earns zero.
- Daily states cycle by clicking.
- Each dimension has an independent point ledger and benchmark (default 1,000).
- 1-month, 3-month and cumulative views are available.
- Historical records preserve snapshots, so later edits do not rewrite previous awards.

## Files

- index.html — application structure
- styles.css — visual design
- app.js — application logic and persistence

No external libraries or network requests are required.