<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&height=200&section=header&text=SOSU&fontSize=80&fontAlignY=35&animation=twinkling&fontColor=gradient"/>
</p>

# 📝 Description

**SOSU** is a modern, user-friendly desktop music player designed specifically for osu! beatmap songs. Built with Electron and React, SOSU provides a beautiful, Spotify-inspired interface that makes it easy to browse, play, and manage your osu! music collection.

Whether you're practicing, listening to your favorite beatmaps, or organizing your music library, SOSU offers everything you need. Enjoy real-time playback controls, custom playlists, Discord Rich Presence integration, direct beatmap links, and a highly responsive design with smooth animations.

Take your osu! music experience to the next level with SOSU.

### 🎬 Watch demo on youtbue (OUTDATED!!!)
[![Watch the video](https://img.youtube.com/vi/d_4Dcfb4kIA/0.jpg)](https://www.youtube.com/watch?v=d_4Dcfb4kIA)

# 🌟 Features (50+ Total)

SOSU comes packed with **50+ features** organized into 7 main categories:

### 🎵 Core Features
- **Music Player** - Play songs from your osu! Songs folder with seamless playback
- **Spotify-inspired UI** - Modern, beautiful interface designed for comfort
- **Playlist Support** - Create, manage, and organize custom playlists
- **Multiple Views** - Library, Favorites, Recently Played, Most Played
- **Auto-save** - Automatic saving of settings and playback state
- **Close Confirmation** - Confirm before closing and choose minimize to tray or quit

### 🔍 Search & Filter
- **Real-time Search** - Instant search with smart suggestions
- **Duration Filter** - Hide songs shorter than specified length
- **Artist Hide List** - Filter out songs from specific artists
- **Advanced Title Filters** - Contains, starts with, ends with filters
- **Remove Duplicates** - Automatically filter duplicate song titles
- **Filter Statistics** - View detailed filter results and stats

### 🎛️ Playback & Audio
- **Full Playback Control** - Play, pause, next, previous, seek, volume
- **Shuffle Mode** - Randomize your playlist playback
- **Repeat Modes** - Repeat all, repeat one, or no repeat
- **Autoplay** - Automatically play next song
- **Playback Speed** - Adjust speed from 0.5x to 2.0x
- **10-band Equalizer** - Professional audio tuning
- **VU Visualizer** - Real-time audio visualization

### 📚 Library Management
- **Favorites** - Mark and organize your favorite songs
- **Play Count Tracking** - See how many times you've played each song
- **Recently Played** - Quick access to your recent listening history
- **Most Played** - Discover your most-played tracks
- **Song Details** - View comprehensive metadata and info

### 🌐 Integrations
- **Discord Rich Presence** - Show what you're listening to on Discord
- **OBS Widget Server** - Display now-playing on your stream
- **WebSocket API** - Control SOSU from external apps
- **Beatmap Links** - Quick links to osu.ppy.sh
- **Now-Playing API** - Public API for current song info

### 🎨 Customization
- **Blurred Album Art** - Dynamic background from album covers
- **Custom Accent Colors** - Personalize your interface colors
- **Dark Theme** - Eye-friendly dark mode by default
- **Hardware Acceleration** - Toggle GPU acceleration for compatibility and performance
- **Widget Themes** - Customize OBS widgets with themes
- **Theme Download** - Get themes directly from GitHub

### 🧰 Data Management
- **Profiles** - Save and switch between multiple setup profiles
- **Profile Import/Export** - Backup or restore your profiles when needed
- **Rescan Library** - Refresh your music library
- **Reset Widgets** - Clear all custom widgets with one action
- **Reset Cache** - Clear cached data to resolve issues fast
- **Settings Reset** - Reset settings only without deleting library data
- **Full Reset** - Clear all local data and start fresh

> **Note:** Profiles do not include tray behavior or hardware acceleration settings.

## 📋 Requirements
- [osu!](https://osu.ppy.sh/) - osu! game installation with Songs folder
- **osu! Songs Folder** - Contains your beatmap audio files (.mp3, .ogg)
  - Default Windows location: `C:\Users\YourName\AppData\Local\osu!\Songs`
  - Default macOS location: `~/Library/Application Support/osu!/Songs`
  - Default Linux location: `~/.local/share/osu!/Songs`

> **Note:** SOSU reads audio files directly from your osu! Songs folder. No additional setup required!

# 🚀 Installation

### Windows Users
- Click [here](https://github.com/Adivise/sosu/releases/latest/download/sosu-2.8.0.exe) to download the recommended Windows installer
- Alternative downloads from the [latest release](https://github.com/Adivise/sosu/releases/latest):
  - **Portable (.exe)**
    - `sosu-2.8.0-portable.exe` (no installation required)
  - **MSI Installer (.msi)**
    - `sosu-2.8.0.msi` (alternative for enterprise environments)
  > *Note: The portable version doesn't save settings between sessions. The installer saves all configuration. Choose the format that best fits your needs.*

### macOS Users
> **Note:** The macOS build is currently in **beta test**. There may be bugs or missing features. Please report any issues you encounter.
- Click [here](https://github.com/Adivise/sosu/releases/latest/download/sosu-2.8.0.dmg) to download the recommended macOS installer
- Alternative downloads from the [latest release](https://github.com/Adivise/sosu/releases/latest):
  - **PKG Installer (.pkg)**
    - `sosu-2.8.0.pkg` (for Apple Silicon Macs)
  > *On first launch, you may need to right-click and choose "Open" to bypass security warnings if the app is not notarized.*

### Linux Users
> **Note:** The Linux build is currently in **beta test**. There may be bugs or missing features. Please report any issues you encounter.
- Click [here](https://github.com/Adivise/sosu/releases/latest/download/sosu-2.8.0.AppImage) to download the recommended Linux AppImage
- Alternative downloads from the [latest release](https://github.com/Adivise/sosu/releases/latest):
  - **Debian Package (.deb)**
    - `sosu_2.8.0.deb`
  - **RPM Package (.rpm)**
    - `sosu-2.8.0.rpm`
  > *You may need to make the AppImage executable: `chmod +x ./sosu-2.8.0.AppImage` and then run it.*

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
