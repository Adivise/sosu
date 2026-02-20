import { registerScanHandlers } from './scanHandlers.js';
import { registerBeatmapPreviewHandlers } from './beatmapPreviewHandlers.js';
import { registerWindowAppHandlers } from './windowAppHandlers.js';
import { registerDataHandlers } from './dataHandlers.js';
import { registerDiscordWidgetHandlers } from './discordWidgetHandlers.js';
import { registerProfileHandlers } from './profileHandlers.js';

export async function init({ mainWindow, setIsQuitting }) {
    registerScanHandlers({ mainWindow });
    registerBeatmapPreviewHandlers({ mainWindow });
    registerWindowAppHandlers({ mainWindow, setIsQuitting });
    registerDataHandlers();
    registerDiscordWidgetHandlers();
    registerProfileHandlers();
}