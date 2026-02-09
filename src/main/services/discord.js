import RPC from 'discord-rpc';

let discordClient = null;
let lastRichPresence = null;

export async function setRichPresence(enabled, presenceData) {
    if (!RPC) return { success: false };

    if (enabled) {
        if (!discordClient) {
            discordClient = new RPC.Client({ transport: 'ipc' });

            discordClient.once('ready', () => {
                if (lastRichPresence) {
                    discordClient.setActivity(lastRichPresence).catch(() => { });
                }
            });

            discordClient.on('error', (err) => {
                console.error('Discord RPC error:', err);
                discordClient = null;
            });

            try {
                await discordClient.login({ clientId: '1449446045892481297' }).catch(() => { });
            } catch (err) {
                discordClient = null;
                return { success: false, error: err.message };
            }
        }

        if (presenceData) {
            const songTitle = (presenceData.title || 'Unknown Song').substring(0, 128);
            const songArtist = (presenceData.artist || 'Unknown Artist').substring(0, 128);
            const albumText = (presenceData.album || 'sosu').substring(0, 128);

            // Format duration
            let durationText = '';
            if (presenceData.duration) {
                const minutes = Math.floor(presenceData.duration / 60);
                const seconds = Math.floor(presenceData.duration % 60);
                durationText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }

            // Build presence object
            lastRichPresence = {
                details: `Song: ${songTitle}`,
                state: `Artist: ${songArtist}`,
                largeImageKey: 'osu_icon',
                largeImageText: albumText || songTitle,
                instance: false,
            };

            // Update small image for playback state (use paused flag instead of startTime)
            if (presenceData.paused === false) {
                lastRichPresence.smallImageKey = 'play';
                lastRichPresence.smallImageText = `⌛: ${durationText}` || 'Playing';
            } else {
                lastRichPresence.smallImageKey = 'pause';
                lastRichPresence.smallImageText = 'Paused';
            }

            // Add beatmap button if applicable
            const buttons = [];
            if (presenceData.beatmapSetId) {
                const beatmapUrl = presenceData.beatmapId
                    ? `https://osu.ppy.sh/beatmapsets/${presenceData.beatmapSetId}#osu/${presenceData.beatmapId}`
                    : `https://osu.ppy.sh/beatmapsets/${presenceData.beatmapSetId}`;
                buttons.push({ label: 'Beatmap', url: beatmapUrl });
            }

            if (buttons.length > 0) {
                lastRichPresence.buttons = buttons.slice(0, 2);
            }

            // Update Discord presence if connected
            if (discordClient && discordClient.transport && discordClient.transport.socket) {
                try {
                    await discordClient.setActivity(lastRichPresence);
                } catch (err) {
                    console.error('Error setting Discord activity:', err);
                }
            } else {
                console.warn('[Discord RPC] Not connected — skipping setActivity');
            }
        }
    } else {
        if (discordClient) {
            try {
                await discordClient.clearActivity();
                await discordClient.destroy();
            } catch (e) {
                console.error('Error clearing Discord activity:', e);
            }
            discordClient = null;
        }
    }

    return { success: true };
}

export async function destroy() {
    if (discordClient) {
        try {
            await discordClient.clearActivity();
            await discordClient.destroy();
        } catch { }
        discordClient = null;
    }
}