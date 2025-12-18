import { autoUpdater } from 'electron-updater';
import { dialog, shell } from 'electron';

export function init() {
    autoUpdater.setFeedURL({
        provider: 'github',
        owner: 'Adivise',
        repo: 'sosu'
    });

    autoUpdater.on('update-available', (info) => {
        dialog
            .showMessageBox({
                type: 'info',
                title: 'Update Available',
                message: `A new version (${info.version}) is available for download.`,
                detail: 'Would you like to open the release page?',
                buttons: ['Download', 'Later'],
                defaultId: 0,
                cancelId: 1
            })
            .then(({ response }) => {
                if (response === 0) {
                    shell.openExternal('https://github.com/Adivise/sosu/releases/latest');
                }
            });
    });

    autoUpdater.on('update-not-available', () => {
        console.log('[Updater] No updates found.');
    });

    autoUpdater.on('error', (err) => {
        console.error('[Updater] Error:', err);
    });

    autoUpdater.on('download-progress', (progressObj) => {
        const percent = progressObj.percent.toFixed(1);
        console.log(`[Updater] Download progress: ${percent}%`);
    });

    autoUpdater.on('update-downloaded', (info) => {
        dialog.showMessageBox({
            type: 'question',
            title: 'Update Ready',
            message: `Version ${info.version} has been downloaded.`,
            detail: 'Would you like to install it now?',
            buttons: ['Install and Restart', 'Later'],
            defaultId: 0,
            cancelId: 1
        }).then(({ response }) => {
            if (response === 0) {
                autoUpdater.quitAndInstall();
            }
        });
    });
}

/**
 * Trigger a manual update check.
 */
export function checkForUpdates() {
    try {
        console.log('[Updater] Checking for updates...');
        autoUpdater.checkForUpdates();
    } catch (e) {
        console.error('[Updater] checkForUpdates() failed:', e);
    }
}