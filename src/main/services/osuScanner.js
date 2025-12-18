import fs from 'fs/promises';
import path from 'path';
import { parseFile } from 'music-metadata';
import parseOsuFile from '../core/parseOsu.js';

export async function scanOsuFolder(folderPath, eventSender) {
    try {
        const songs = [];
        const entries = await fs.readdir(folderPath, { withFileTypes: true });

        // Count valid subfolders (those containing .osu + audio)
        let totalSongs = 0;
        for (const entry of entries) {
            if (entry.isDirectory()) {
                try {
                    const songPath = path.join(folderPath, entry.name);
                    const songFiles = await fs.readdir(songPath);
                    const osuFiles = songFiles.filter(f => f.endsWith('.osu'));
                    const audioFiles = songFiles.filter(f => /\.(mp3|ogg|wav|flac)$/i.test(f));
                    if (osuFiles.length > 0 && audioFiles.length > 0) totalSongs++;
                } catch {
                    /* ignore */
                }
            }
        }

        let processedCount = 0;
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;

            const songPath = path.join(folderPath, entry.name);
            let songFiles;
            try {
                songFiles = await fs.readdir(songPath);
            } catch {
                processedCount++;
                if (eventSender && eventSender.send && !eventSender.isDestroyed())
                    eventSender.send('scan-progress', { current: processedCount, total: totalSongs });
                continue;
            }

            const osuFiles = songFiles.filter(f => f.endsWith('.osu'));
            const audioFiles = songFiles.filter(f => /\.mp3$/i.test(f));
            const imageFiles = songFiles.filter(f => /\.(jpg|jpeg|png|gif|bmp)$/i.test(f));

            if (osuFiles.length > 0 && audioFiles.length > 0) {
                const audioFilePath = path.join(songPath, audioFiles[0]);
                const osuFilePath = path.join(songPath, osuFiles[0]);
                const osuContent = await fs.readFile(osuFilePath, 'utf-8');
                const osuMetadata = parseOsuFile(osuContent);

                let audioMetadata = null;
                let embeddedImage = null;
                let duration = null;

                try {
                    audioMetadata = await parseFile(audioFilePath);
                    if (audioMetadata.format.duration)
                        duration = audioMetadata.format.duration;
                    if (audioMetadata.common.picture && audioMetadata.common.picture.length > 0) {
                        const picture = audioMetadata.common.picture[0];
                        embeddedImage = { data: picture.data, format: picture.format, description: picture.description };
                    }
                } catch (err) {
                    console.error('Audio metadata error for', audioFilePath, err.message || err);
                }

                let imageFile = null;
                let imageFileName = null;
                if (imageFiles.length > 0) {
                    imageFile = path.join(songPath, imageFiles[0]);
                    imageFileName = imageFiles[0];
                } else if (embeddedImage) {
                    const imageExt =
                        embeddedImage.format === 'image/jpeg'
                            ? 'jpg'
                            : embeddedImage.format === 'image/png'
                                ? 'png'
                                : 'jpg';
                    const embeddedImagePath = path.join(songPath, `embedded_cover.${imageExt}`);
                    try {
                        await fs.writeFile(embeddedImagePath, embeddedImage.data);
                        imageFile = embeddedImagePath;
                        imageFileName = `embedded_cover.${imageExt}`;
                    } catch (err) {
                        console.error('Error saving embedded image:', err);
                    }
                }

                let beatmapSetId = osuMetadata.beatmapSetId;
                if (!beatmapSetId && entry.name) {
                    const folderMatch = entry.name.match(/^(\d+)\s/);
                    if (folderMatch) beatmapSetId = parseInt(folderMatch[1]);
                }

                songs.push({
                    id: entry.name,
                    folderName: entry.name,
                    folderPath: songPath,
                    title: osuMetadata.title || audioMetadata?.common?.title || entry.name,
                    artist:
                        osuMetadata.artist ||
                        audioMetadata?.common?.artist ||
                        (audioMetadata?.common?.artists && audioMetadata.common.artists.join(', ')) ||
                        'Unknown Artist',
                    album: audioMetadata?.common?.album || null,
                    audioFile: audioFilePath,
                    audioFileName: audioFiles[0],
                    imageFile,
                    imageFileName,
                    duration,
                    bpm: osuMetadata.bpm || null,
                    difficulty: osuMetadata.difficulty || null,
                    year: audioMetadata?.common?.year || null,
                    genre: audioMetadata?.common?.genre?.join(', ') || null,
                    beatmapSetId,
                    beatmapId: osuMetadata.beatmapId,
                });
            }

            processedCount++;
            if (eventSender && eventSender.send && !eventSender.isDestroyed())
                eventSender.send('scan-progress', { current: processedCount, total: totalSongs });
        }

        return { success: true, songs };
    } catch (error) {
        console.error('Error scanning folder:', error);
        return { success: false, error: error.message || String(error) };
    }
}