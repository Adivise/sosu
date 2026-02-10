<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&height=200&section=header&text=SOSU&fontSize=80&fontAlignY=35&animation=twinkling&fontColor=gradient"/>
</p>

# 📝 Description

**SOSU** is a modern, user-friendly desktop music player designed specifically for osu! beatmap songs. Built with Electron and React, SOSU provides a beautiful, Spotify-inspired interface that makes it easy to browse, play, and manage your osu! music collection.

Whether you're practicing, listening to your favorite beatmaps, or organizing your music library, SOSU offers everything you need. Enjoy real-time playback controls, custom playlists, Discord Rich Presence integration, direct beatmap links, and a highly responsive design with smooth animations.

Take your osu! music experience to the next level with SOSU.

### 🎬 Watch demo on youtbue
[![Watch the video](https://img.youtube.com/vi/d_4Dcfb4kIA/0.jpg)](https://www.youtube.com/watch?v=d_4Dcfb4kIA)

# 🌟 Features

### Core
- 🎵 **Music Player** - Play songs from your osu! Songs folder
- 🎨 **Modern UI** - Beautiful, dark-themed interface inspired by Spotify
- 📁 **Playlist Support** - Create and manage custom playlists
- 📑 **Views: Library, Favorites, Recently Played, Most Played** - Multiple ways to browse your osu! music
- 💾 **Auto Save** - Playlists, filters, equalizer, theme, playback state and more are saved automatically

### Search, Filters & Library
- 🔍 **Search Bar with Suggestions** - Real-time search with history and smart suggestions by title / artist / folder
- 🎚️ **Duration Filter** - Hide songs shorter than a minimum duration (per second)
- 🎤 **Artist Filter** - Hide songs from specific artists using a searchable list
- 🏷️ **Title Filters** - Hide songs whose titles match custom keywords (contains / starts with / ends with)
- 🧹 **Duplicate Title Filter** - Optionally show only one song per title to reduce clutter in Library
- 📈 **Filter Statistics** - See total / visible / hidden songs, plus a breakdown (duration / artist / title / duplicates)
- 📄 **Per-View Pagination** - Library, Favorites, Most Played, playlists etc. each remember their own current page

### Playback & Audio
- 🎛️ **Full Playback Controls** - Shuffle, repeat, autoplay, next/previous, seek and volume control
- 🎚️ **10-Band Equalizer** - Custom EQ with multiple presets and fine 0.1 dB adjustments
- 🎵 **Per-Song Favorites** - Mark favorites, with dedicated Favorites view
- 📈 **Play Count Tracking** - Tracks how often you play each song, powering the Most Played view
- 🕒 **Playback Speed Control** - Change speed (0.5x–2.0x) with presets and a detailed slider
- 📊 **Progress Bar** - Visual timeline with drag-to-seek support

### Integrations & Streaming
- 🎮 **Discord Rich Presence** - Show current song on your Discord profile
- 🌐 **Widget Server (OBS/Stream)** - Built-in HTTP + WebSocket server for overlay widgets in OBS / Streamlabs
- 📡 **Widget API Docs & Themes** - Auto-generated docs and theme browser at `http://localhost:3737/`
- 🔗 **Beatmap Links** - Click song titles/artists to open beatmaps on osu.ppy.sh

### Appearance & Data
- 🖼️ **Blurred Album Art Background** - Optional blurred background based on current song cover
- 🎨 **Custom Accent Color** - Select any accent color or use presets (Spotify green, violet, pink, etc.)
- 🧾 **Backup & Restore** - Export/import all playlists, favorites, play counts and settings as JSON
- ♻️ **Rescan & Reset** - Rescan osu! Songs folder or fully reset the app to first-run state from Settings
- ⚡ **Fast & Lightweight** - Optimized scanning and metadata caching for large osu! libraries
- 📱 **Cross-Platform** - Available for Windows, macOS, and Linux

## 📋 Requirements
- [osu!](https://osu.ppy.sh/) - osu! game installation with Songs folder
- **osu! Songs Folder** - Contains your beatmap audio files (.mp3, .ogg)
  - Default Windows location: `C:\Users\YourName\AppData\Local\osu!\Songs`
  - Default macOS location: `~/Library/Application Support/osu!/Songs`
  - Default Linux location: `~/.local/share/osu!/Songs`

> **Note:** SOSU reads audio files directly from your osu! Songs folder. No additional setup required!

# 🚀 Installation

### Windows Users
- Click [here](https://github.com/Adivise/sosu/releases/latest/download/sosu-2.3.0.exe) to download the recommended Windows installer
- Alternative downloads from the [latest release](https://github.com/Adivise/sosu/releases/latest):
  - **Portable (.exe)**
    - `sosu-2.3.0-portable.exe` (no installation required)
  - **MSI Installer (.msi)**
    - `sosu-2.3.0.msi` (alternative for enterprise environments)
  > *Note: The portable version doesn't save settings between sessions. The installer saves all configuration. Choose the format that best fits your needs.*

### macOS Users
> **Note:** The macOS build is currently in **beta test**. There may be bugs or missing features. Please report any issues you encounter.
- Click [here](https://github.com/Adivise/sosu/releases/latest/download/sosu-2.3.0.dmg) to download the recommended macOS installer
- Alternative downloads from the [latest release](https://github.com/Adivise/sosu/releases/latest):
  - **PKG Installer (.pkg)**
    - `sosu-2.3.0.pkg` (for Apple Silicon Macs)
  > *On first launch, you may need to right-click and choose "Open" to bypass security warnings if the app is not notarized.*

### Linux Users
> **Note:** The Linux build is currently in **beta test**. There may be bugs or missing features. Please report any issues you encounter.
- Click [here](https://github.com/Adivise/sosu/releases/latest/download/sosu-2.3.0.AppImage) to download the recommended Linux AppImage
- Alternative downloads from the [latest release](https://github.com/Adivise/sosu/releases/latest):
  - **Debian Package (.deb)**
    - `sosu_2.3.0.deb`
  - **RPM Package (.rpm)**
    - `sosu-2.3.0.rpm`
  > *You may need to make the AppImage executable: `chmod +x ./sosu-2.3.0.AppImage` and then run it.*

> **Note:** `.yml` and `.blockmap` files are for auto-update and can be ignored by most users. Download the installer or portable/archive for your platform.

# 👥 Contributors

<p align="center">
  <a href="https://github.com/Adivise/sosu/graphs/contributors">
    <img src="https://contributors-img.web.app/image?repo=Adivise/sosu" alt="Project Contributors"/>
  </a>
</p>

# 📄 License

This project is licensed under the Apache-2.0 License - see the [LICENSE](LICENSE) file for details.

<p align="center">
  Made with ❤️ by <a href="https://github.com/Adivise">Adivise</a> for the osu! community
</p>
