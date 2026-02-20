## sosu renderer structure

- **Entry points**
  - `src/renderer/src/index.jsx`: bootstraps the main app window and renders `App`.
  - `src/renderer/beatmap-player-entry.jsx`: bootstraps the separate beatmap preview/player window and renders `BeatmapViewer`.

- **Core composition**
  - `src/renderer/src/App.jsx`: main orchestrator; wires IPC, scanning, playback, playlists, settings, and passes state/handlers down to UI components.
  - Layout components live under `src/renderer/src/components/`:
    - High-level layout: `Sidebar`, `MainContent`, `TitleBar`, `PlayerBar`, `LoadingScreen`, `FirstRunScreen`.
    - Song list & item UI: `SongList`, `SongItem`, `ContextMenu`, `SongDetailsModal`, `PreviewDetailsModal`.
    - Playlists & menus: `PlaylistMenu`, `CreatePlaylistModal`, `PreviewDuplicatesMenu`.
    - Settings: `SettingsModal` plus tabs in `components/settings/` (`GeneralSettingsTab`, `AppearanceSettingsTab`, `FiltersSettingsTab`, `DataSettingsTab`, `IntegrationsSettingsTab`, `ResetSettingsTab`).
    - Misc UI: `SearchBar`/`SearchSuggestions`, `CloseConfirmDialog`, `EQModal`, `MiniVUWaveform`, `VUPanel`.

- **Beatmap preview / viewer**
  - Main viewer component: `components/BeatmapViewer.jsx`.
  - Subcomponents:
    - `BeatmapViewerTimeline.jsx`: canvas timeline & zoom/beat-snap controls (uses `utils/timelineRenderer.js`).
    - `BeatmapViewerProgress.jsx`: playback progress + scrubber.
    - `BeatmapViewerSettings.jsx`: viewer-specific settings (e.g. speed, visual options).
    - `BeatmapViewerFps.jsx`: FPS overlay / performance info.
  - Low-level rendering utilities (all under `src/renderer/src/utils/`):
    - `playfieldDrawUtils.js`: shared constants and helpers for drawing.
    - `playfieldDrawCircle.js`, `playfieldDrawSlider.js`, `playfieldDrawReverseSlider.js`, `playfieldDrawSpinner.js`: primitives for each object type.
    - `playfieldRenderObjects.js`: orchestrates drawing all objects via the primitives.
    - `timelineRenderer.js`: shared logic for drawing the timeline canvas.
  - Hook:
    - `hooks/usePlayfieldRenderer.js`: manages the playfield canvas, timing, and render loop for `BeatmapViewer`.

- **State and logic helpers**
  - Hooks:
    - `hooks/useSongs.js`: manages library scanning, caching, and playback-related song state.
    - `hooks/useLocalStorageState.js`: persistent state backed by `localStorage`.
    - `components/useAudioEqualizer.js`: audio EQ setup and control for `PlayerBar`.
  - Handlers (imperative logic grouped by concern) under `src/renderer/src/handlers/`:
    - `playbackHandlers.js`: play/pause/seek, queue and now-playing behavior.
    - `playlistHandlers.js`: playlist CRUD and interactions.
    - `viewHandlers.js`: UI view switching, filters, and layout-related actions.
    - `windowHandlers.js`: window-level actions (close, minimize, etc.).
    - `eventHandlers.js`: global/event wiring helpers.
    - `saveHandlers.js`: saving user data and settings.
    - `profileHandlers.js`: profile-related flows.
    - `resetAppToDefaults.js`: reset/clear app data.
    - `discordWidgetHandlers.js`: Discord/OBS widget-related actions.

- **Shared utilities**
  - `utils/songFilters.js`: song filtering logic (search, duration, etc.).
  - `utils/songHelpers.js`: helper transforms and derived song info.
  - `utils/colorUtils.js`: color math and helpers (e.g., `adjustBrightness`, `getContrastColor`).
  - `utils/userDataSave.js`: persistence helpers for user data.
  - `utils/playbackHelpers.js`: small helpers around playback state.
  - `version.js`: central place for app/version info used in the UI.

- **Conventions**
  - **Components**: place UI pieces under `components/`; prefer small, focused components and colocate CSS next to them.
  - **Shared logic**: when you find yourself reusing the same logic in more than one place, extract it into:
    - `hooks/` if it manages React state/side effects.
    - `utils/` if it is pure data/formatting/math logic.
    - `handlers/` if it is imperative logic that wires UI events to IPC or global behavior.
  - **Beatmap preview code**: keep anything specific to the beatmap player and preview behavior in `BeatmapViewer*` components, `usePlayfieldRenderer`, and the `playfield*`/`timelineRenderer` utils to avoid scattering rendering logic across unrelated components.

