# Habit Radar

A focused, local-first habit tracker built around a user-defined character radar.

The application is intentionally limited to habit tracking and statistics. It does not bundle a calendar, task manager, journal or Pomodoro timer.

## Product model

- **Dimensions** are editable axes of the character radar (Health, Academics, Relationships, or anything else).
- **Habit pools** are editable collections. Create, rename, archive or remove pools whenever needed.
- **Habits** can be assigned independent point contributions to one or more dimensions.
- **Active configuration** is simply the set of enabled habits. Enable or disable anything at any time; there are no mandatory seasons or fixed programmes.
- **Daily states** cycle through Not completed → Completed → Minimum viable action → Not completed.
- **MVA** uses one global multiplier (default 0.25×, adjustable from 0.10× to 0.50×).
- **Statistics** provide 1-month, 3-month and cumulative views. Each dimension has an independent point ledger and benchmark (default 1,000 points).

Historical awards store snapshots of habit names, pool names, point allocations and the MVA multiplier used at the time. Editing or archiving an object does not rewrite prior awards.

## Portable Linux build

The desktop build is packaged as a Linux AppImage. The portable folder contains:

```text
Habit-Radar-Linux/
├── Habit-Radar.AppImage
├── Launch.sh
├── README.txt
└── data/
    └── backups/
```

Download the **Habit-Radar-Linux-Portable** artifact from the repository's [Build portable Linux app workflow](../../actions/workflows/build-portable.yml), extract it, and double-click `Habit-Radar.AppImage` (or `Launch.sh`). The first launch creates `data/habit-radar.json` beside the AppImage. A rolling recovery copy is kept at `data/backups/previous-state.json`.

Move the complete extracted folder to move the application and its records together. Keep it in a writable location, such as your home directory. Do not move only the AppImage if you want to take your data with it.

The AppImage build is produced by GitHub Actions. The source bundle is stored at `.source/habit-radar-v2-source.tar.gz`. The original `Habit [Radar].html` remains in the repository as the legacy prototype.

## Development

```bash
npm install
npm test
npm run tauri -- dev
npm run tauri -- build --bundles appimage
```

Linux build dependencies are documented in the [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/#linux).
