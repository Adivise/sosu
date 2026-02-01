<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&height=200&section=header&text=SOSU&fontSize=80&fontAlignY=35&animation=twinkling&fontColor=gradient"/>
</p>

# 📝 Description

**SOSU** is a modern, user-friendly desktop music player designed specifically for osu! beatmap songs. Built with Electron and React, SOSU provides a beautiful, Spotify-inspired interface that makes it easy to browse, play, and manage your osu! music collection.

Whether you're practicing, listening to your favorite beatmaps, or organizing your music library, SOSU offers everything you need. Enjoy real-time playback controls, custom playlists, Discord Rich Presence integration, direct beatmap links, and a highly responsive design with smooth animations.

Take your osu! music experience to the next level with SOSU.

### 🎬 Watch demo on youtbue
[![Watch the video](https://img.youtube.com/vi/d_4Dcfb4kIA/0.jpg)](https://www.youtube.com/watch?v=d_4Dcfb4kIA)

## Quick user features
A short, friendly summary of core features for new users — full details and screenshots are in `README.user.md`.

- 🎵 Play songs from your local `osu!` Songs folder with quick scanning & caching
- 🔍 Fast search with suggestions, useful filters (duration, artist, title) and duplicate handling
- ▶️ Full playback experience: shuffle, repeat, autoplay, speed control and a 10-band EQ
- 📁 Playlists, favorites, and play-counts (Most Played view)
- 🌐 Optional integrations: Discord Rich Presence and OBS-compatible widget server
- 🧾 Export/import settings & playlists, plus an easy Reset to defaults

## 📋 Requirements
- [osu!](https://osu.ppy.sh/) - osu! game installation with Songs folder
- **osu! Songs Folder** - Contains your beatmap audio files (.mp3, .ogg)
  - Default Windows location: `C:\Users\YourName\AppData\Local\osu!\Songs`
  - Default macOS location: `~/Library/Application Support/osu!/Songs`
  - Default Linux location: `~/.local/share/osu!/Songs`

> **Note:** SOSU reads audio files directly from your osu! Songs folder. No additional setup required!

# 🚀 Installation

### Windows Users
- Click [here](https://github.com/Adivise/sosu/releases/latest/download/sosu-2.0.0.exe) to download the recommended Windows installer
- Alternative downloads from the [latest release](https://github.com/Adivise/sosu/releases/latest):
  - **Portable (.exe)**
    - `sosu-2.0.0-portable.exe` (no installation required)
  - **MSI Installer (.msi)**
    - `sosu-2.0.0.msi` (alternative for enterprise environments)
  > *Note: The portable version doesn't save settings between sessions. The installer saves all configuration. Choose the format that best fits your needs.*

### macOS Users
> **Note:** The macOS build is currently in **beta test**. There may be bugs or missing features. Please report any issues you encounter.
- Click [here](https://github.com/Adivise/sosu/releases/latest/download/sosu-2.0.0.dmg) to download the recommended macOS installer
- Alternative downloads from the [latest release](https://github.com/Adivise/sosu/releases/latest):
  - **PKG Installer (.pkg)**
    - `sosu-2.0.0.pkg` (for Apple Silicon Macs)
  > *On first launch, you may need to right-click and choose "Open" to bypass security warnings if the app is not notarized.*

### Linux Users
> **Note:** The Linux build is currently in **beta test**. There may be bugs or missing features. Please report any issues you encounter.
- Click [here](https://github.com/Adivise/sosu/releases/latest/download/sosu-2.0.0.AppImage) to download the recommended Linux AppImage
- Alternative downloads from the [latest release](https://github.com/Adivise/sosu/releases/latest):
  - **Debian Package (.deb)**
    - `sosu_2.0.0.deb`
  - **RPM Package (.rpm)**
    - `sosu-2.0.0.rpm`
  > *You may need to make the AppImage executable: `chmod +x ./sosu-2.0.0.AppImage` and then run it.*

> **Note:** `.yml` and `.blockmap` files are for auto-update and can be ignored by most users. Download the installer or portable/archive for your platform.

# 👥 Contributors

<p align="center">
  <a href="https://github.com/Adivise/sosu/graphs/contributors">
    <img src="https://contributors-img.web.app/image?repo=Adivise/sosu" alt="Project Contributors"/>
  </a>
</p>

# 📄 License

This project is licensed under the **Apache-2.0** License - see the [LICENSE](LICENSE) file for details.

<p align="center">
  Made with ❤️ by <a href="https://github.com/Adivise">Adivise</a> for the osu! community
</p>
