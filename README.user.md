# SOSU — User Guide

This document is for users who want to install and use SOSU (no development knowledge required).

## Quick Overview
- SOSU plays music from your local `osu!` Songs folder.
- Features include playlists, search & filters, a 10-band EQ, Discord presence and an optional OBS widget server.

## Features
A friendly overview of what SOSU provides, grouped for convenience.

### Library & Scanning
- Fast scan of your osu! Songs folder with metadata extraction and caching for quick loads.
- Optional full-rescan (scan all maps) when you want to rebuild the library.

### Browse & Filters
- Smart search with suggestions while you type (title, artist, folder).
- Useful filters: minimum duration, artist hide list, and title matching options.
- Duplicate detection and per-view pagination so you don’t lose your place.

### Playback & Audio
- Full controls: play/pause, next/previous, seek and precise volume.
- Shuffle, repeat, and autoplay modes with clear behavior.
- Playback speed control and a 10‑band equalizer with presets.
- Optional VU visualizer for a nice visual effect while music plays.

### Playlists & Library Management
- Create, edit and manage playlists, add songs from the context menu.
- Mark favorites and track play counts for easy discovery of most-played songs.

### Integrations & Export
- Discord Rich Presence support to show current song on your profile.
- Optional OBS-friendly widget server for streaming overlays (includes themes).
- Export and import your settings and playlists as JSON for backups and transfers.

### Advanced / Developer
- If you want implementation details or to contribute, see `README.dev.md` for developer setup and notes.

## Download & Install
Get the latest installer or archive for your platform:

https://github.com/Adivise/sosu/releases/latest

Supported packages: Windows (.exe, .msi), macOS (.dmg), Linux (AppImage)

## First Run
1. Open SOSU.
2. Go to Settings → Select your osu! Songs folder.
3. Start scan and wait for the library to populate.

## Common Tasks
- Play / Pause: Use the main PlayerBar controls.
- Create playlist: Use the sidebar or the context menu on any song.
- Search: Type in the search bar; suggestions appear automatically.
- Filters: Use duration, artist or title filters to narrow results.

## Troubleshooting
- Songs not appearing: ensure the selected folder contains `.mp3`/`.ogg` and re-scan.
- Widget server not showing: enable it in Settings and visit `http://localhost:3737/docs` while SOSU is running.
- Discord Rich Presence not updating: ensure Discord is running and the feature is enabled in Settings.

If issues persist, open DevTools (Renderer window) and check the Console logs; then open an issue on the repo with logs and steps to reproduce.

---

## Export / Import Settings
You can export all settings and playlists to a JSON file (Settings → Export). Importing restores those values.

## Reset to Defaults
Settings → Reset will clear local settings and playlists. This is useful if you've misconfigured your setup.

---

## License
SOSU is available under the Apache-2.0 license. See `LICENSE` for details.
