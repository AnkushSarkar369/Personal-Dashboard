# Habit Radar

A focused, portable habit tracker in one self-contained HTML file. No framework, package manager, build step, localhost server, AppImage, external assets or account.

## Run

Open `index.html` directly in a browser. The styles and application logic are embedded in the HTML, so it also works when opened through Android file managers that provide a `content://` URL and cannot expose neighbouring files.

The app automatically saves to browser local storage where the browser permits it. For a portable file backup, use Settings & data → Export JSON. Import JSON restores the full state.

On desktop Chromium browsers that support the File System Access API, Settings & data → Choose data folder can additionally save `habit-radar.json` into a selected folder. This is optional; the application does not require it.

## Product model

- Editable dimensions, pools, habits, point allocations and active configuration.
- Habits can contribute to multiple dimensions.
- Completed earns 100%; MVA earns the global multiplier (default 0.25×); Not completed earns zero.
- Daily states cycle by clicking.
- Each dimension has an independent point ledger and benchmark (default 1,000).
- 1-month, 3-month and cumulative views.
- Historical records preserve snapshots, so later edits do not rewrite previous awards.

## File

- `index.html` — complete application: HTML, CSS and JavaScript.

No external libraries or network requests are required.