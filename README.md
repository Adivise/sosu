<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&height=200&section=header&text=SOSU&fontSize=80&fontAlignY=35&animation=twinkling&fontColor=gradient"/>
</p>

# 📝 Description

**SOSU** is a modern, user-friendly desktop music player designed specifically for osu! beatmap songs. Built with Electron and React, SOSU provides a beautiful, Spotify-inspired interface that makes it easy to browse, play, and manage your osu! music collection.

Whether you're practicing, listening to your favorite beatmaps, or organizing your music library, SOSU offers everything you need. Enjoy real-time playback controls, custom playlists, Discord Rich Presence integration, direct beatmap links, and a highly responsive design with smooth animations.

Take your osu! music experience to the next level with SOSU.

<p align="center">
  <img src="https://media.discordapp.net/attachments/1310606318977028139/1451114020701732935/main.png?ex=6944febe&is=6943ad3e&hm=73be380220cad4f90e154e6d46e1f6c31385bc0d34ebc4ebd22baacec1289e92&=&format=webp&quality=lossless&width=1113&height=770" alt="SOSU Screenshot"/>
  <img src="https://media.discordapp.net/attachments/1310606318977028139/1451114020194091120/setting.png?ex=6944febe&is=6943ad3e&hm=ef94188bb0ac1fb524817ce3926bde3a444828b891282d5ccaf83e2472fc4392&=&format=webp&quality=lossless&width=1111&height=770" alt="SOSU Screenshot"/>
</p>

# 🌟 Features

- 🎵 **Music Player** - Play songs from your osu! Songs folder
- 🎨 **Modern UI** - Beautiful, dark-themed interface inspired by Spotify
- 📁 **Playlist Support** - Create and manage custom playlists
- 🔍 **Search & Filter** - Quickly find songs by title, artist, or folder name
- 🎮 **Discord Rich Presence** - Show what you're listening to on Discord
- 🔗 **Beatmap Links** - Click on song titles/artists to open beatmaps on osu.ppy.sh
- ⚡ **Fast & Lightweight** - Optimized performance with metadata caching
- 🎛️ **Playback Controls** - Shuffle, repeat, autoplay, and volume control
- 📱 **Cross-Platform** - Available for Windows, macOS, and Linux
- 🔄 **Session Persistence** - Automatically saves your playlists and preferences
- 🎯 **Smart Metadata** - Automatically extracts song information from audio files
- 📊 **Progress Tracking** - Visual progress bar with seek functionality

<details>
<summary>🎮 Playback Features [CLICK ME]</summary>

## 🎮 Available Playback Features

### Basic Controls
- ▶️ **Play/Pause** - Start or pause playback
- ⏭️ **Next** - Skip to the next song
- ⏮️ **Previous** - Go back to the previous song
- 🔊 **Volume Control** - Adjust playback volume with visual slider

### Advanced Controls
- 🔀 **Shuffle** - Randomize song playback order
- 🔁 **Repeat** - Loop the current song
- ⚡ **Autoplay** - Automatically play the next song when current ends
- 📊 **Progress Bar** - Visual timeline with click-to-seek functionality

### Music Management
- 📁 **Playlists** - Create unlimited custom playlists
- ➕ **Add to Playlist** - Quickly add songs to any playlist
- 🗑️ **Remove from Playlist** - Remove songs from playlists
- 🔍 **Search** - Real-time search across all songs
- 🎵 **Song List** - Browse all your osu! songs in one place

### Integration Features
- 🎮 **Discord Rich Presence** - Show current song on Discord
- 🔗 **Beatmap Links** - Direct links to osu.ppy.sh beatmaps
- 💾 **Metadata Cache** - Fast loading with cached song information
- 📂 **Folder Selection** - Easy osu! Songs folder selection

</details>

<details>
<summary>🚀 Requirements [CLICK ME]</summary>

## 📋 Requirements

- [Node.js](https://nodejs.org/en/download/) - Version 20 or higher (for building from source)
- [osu!](https://osu.ppy.sh/) - osu! game installation with Songs folder
- **osu! Songs Folder** - Contains your beatmap audio files (.mp3, .ogg)
  - Default Windows location: `C:\Users\YourName\AppData\Local\osu!\Songs`
  - Default macOS location: `~/Library/Application Support/osu!/Songs`
  - Default Linux location: `~/.local/share/osu!/Songs`

> **Note:** SOSU reads audio files directly from your osu! Songs folder. No additional setup required!

</details>

# 🚀 Installation

## For Regular Users

### Windows Users
- Click [here](https://github.com/Adivise/sosu/releases/latest/download/sosu-1.0.5.exe) to download the recommended Windows installer
- Alternative downloads from the [latest release](https://github.com/Adivise/sosu/releases/latest):
  - **Portable (.exe)**
    - `sosu-1.0.5-portable.exe` (no installation required)
  - **MSI Installer (.msi)**
    - `sosu-1.0.5.msi` (alternative for enterprise environments)
  > *Note: The portable version doesn't save settings between sessions. The installer saves all configuration. Choose the format that best fits your needs.*

### macOS Users
> **Note:** The macOS build is currently in **beta test**. There may be bugs or missing features. Please report any issues you encounter.
- Click [here](https://github.com/Adivise/sosu/releases/latest/download/sosu-1.0.5.dmg) to download the recommended macOS installer
- Alternative downloads from the [latest release](https://github.com/Adivise/sosu/releases/latest):
  - **PKG Installer (.pkg)**
    - `sosu-1.0.5.pkg` (for Apple Silicon Macs)
  > *On first launch, you may need to right-click and choose "Open" to bypass security warnings if the app is not notarized.*

### Linux Users
> **Note:** The Linux build is currently in **beta test**. There may be bugs or missing features. Please report any issues you encounter.
- Click [here](https://github.com/Adivise/sosu/releases/latest/download/sosu-1.0.5.AppImage) to download the recommended Linux AppImage
- Alternative downloads from the [latest release](https://github.com/Adivise/sosu/releases/latest):
  - **Debian Package (.deb)**
    - `sosu_1.0.5.deb`
  - **RPM Package (.rpm)**
    - `sosu-1.0.5.rpm`
  > *You may need to make the AppImage executable: `chmod +x ./sosu-1.0.5.AppImage` and then run it.*

> **Note:** `.yml` and `.blockmap` files are for auto-update and can be ignored by most users. Download the installer or portable/archive for your platform.

<details>
<summary>⭐ For Developers [CLICK ME]</summary>

## ⭐ For Developers

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Adivise/sosu.git
   cd sosu
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build the Application**
   ```bash
   # For Windows
   npm run build
   npm run build:electron -- --win
   
   # For macOS
   npm run build
   npm run build:electron -- --mac
   
   # For Linux
   npm run build
   npm run build:electron -- --linux
   ```

4. **Development Mode**
   ```bash
   npm run dev
   ```
   This will start the React development server and launch Electron with hot-reload enabled.

### Available Scripts

- `npm run dev` - Start development mode (React + Electron)
- `npm run build` - Build React app for production
- `npm run build:electron` - Build Electron app for distribution
- `npm run sync-version` - Sync version from package.json to src/version.js
- `npm start` - Start Electron app (requires built React app)

### Project Structure

```
sosu/
├── electron/          # Electron main process files
│   ├── main.js       # Main process entry point
│   └── preload.js    # Preload script for secure IPC
├── src/              # React application source
│   ├── components/   # React components
│   ├── App.jsx       # Main app component
│   └── index.jsx     # React entry point
├── resources/        # App resources (icons, licenses)
├── scripts/          # Build scripts
└── public/           # Static files
```

</details>

# 📖 Usage

## First Launch

1. Launch the application
2. Click on "Select Folder" in the sidebar or go to Settings
3. Navigate to your osu! Songs folder (typically located at `C:\Users\YourName\AppData\Local\osu!\Songs` on Windows)
4. The app will scan and load all your songs

## Basic Controls

- **Play/Pause**: Click the play button in the player bar or click on a song
- **Next/Previous**: Use the skip buttons in the player bar
- **Volume**: Adjust using the volume slider in the player bar
- **Search**: Use the search bar to filter songs
- **Playlists**: Create playlists from "Your Playlists" in the sidebar

## Advanced Features

- **Shuffle**: Enable shuffle mode to play songs randomly
- **Repeat**: Enable repeat mode to loop the current song
- **Autoplay**: Enable autoplay to automatically play the next song
- **Discord Rich Presence**: Enable in Settings to show your current song on Discord
- **Beatmap Links**: Click on any song title or artist name to open the beatmap on osu.ppy.sh

# ⚙️ Configuration

## Electron Builder

The build configuration is in `electron-builder.yml`. Key settings:

- **App ID**: `com.sosu.app`
- **Product Name**: `sosu`
- **Icons**: Located in `resources/` directory
- **Output**: `dist/` directory

## User Data

Application data is stored in:
- **Windows**: `%APPDATA%/sosu/`
- **macOS**: `~/Library/Application Support/sosu/`
- **Linux**: `~/.config/sosu/`

This includes:
- User preferences
- Playlists
- Songs metadata cache

# 🔧 Troubleshooting

## Songs Not Loading

- Ensure you've selected the correct osu! Songs folder
- Check that the folder contains `.mp3` or `.ogg` audio files
- Try removing the folder and re-selecting it

## Discord Rich Presence Not Working

- Make sure Discord is running
- Check that Rich Presence is enabled in Settings
- Restart the application if it still doesn't work

## Build Errors

- Ensure all dependencies are installed: `npm install`
- Make sure icon files in `resources/` are at least 256x256 pixels
- Check that Node.js version is 20 or higher

# 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

# 👥 Contributors

<p align="center">
  <a href="https://github.com/Adivise/sosu/graphs/contributors">
    <img src="https://contributors-img.web.app/image?repo=Adivise/sosu" alt="Project Contributors"/>
  </a>
</p>

# 📄 License

This project is licensed under the Apache-2.0 License - see the [LICENSE](LICENSE) file for details.

# 🙏 Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- UI components with [React](https://reactjs.org/)
- Icons from [Lucide](https://lucide.dev/)
- Music metadata parsing with [music-metadata](https://github.com/Borewit/music-metadata)
- Discord integration with [discord-rpc](https://github.com/discord/discord-rpc)

<p align="center">
  Made with ❤️ by <a href="https://github.com/Adivise">Adivise</a> for the osu! community
</p>
