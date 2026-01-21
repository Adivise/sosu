import fs from 'fs/promises';
import path from 'path';
import { parseFile } from 'music-metadata';
import parseOsuFile from '../core/parseOsu.js';

export async function scanOsuFolder(folderPath, eventSender, existingCache = null) {
    try {
        const songs = [];
        const entries = await fs.readdir(folderPath, { withFileTypes: true });
        
        // Create a map of existing songs by folder name for quick lookup
        const cacheMap = new Map();
        if (existingCache && existingCache.songs) {
            existingCache.songs.forEach(song => {
                if (song.folderName) {
                    cacheMap.set(song.folderName, song);
                }
            });
        }

        // Create a set of current folder names to detect deleted songs
        const currentFolderNames = new Set();
        
        // Count valid folders
        let totalSongs = 0;
        for (const entry of entries) {
            if (entry.isDirectory()) {
                currentFolderNames.add(entry.name);
                try {
                    const songPath = path.join(folderPath, entry.name);
                    const files = await fs.readdir(songPath);
                    const osuFiles = files.filter(f => f.endsWith('.osu'));
                    const audioFiles = files.filter(f => /\.(mp3|ogg|wav|flac)$/i.test(f));
                    if (osuFiles.length > 0 && audioFiles.length > 0) totalSongs++;
                } catch { /* ignore */ }
            }
        }
        
        // Stats for logging
        let reusedCount = 0;
        let newCount = 0;
        let deletedCount = 0;
        
        // Check for deleted songs in cache
        if (cacheMap.size > 0) {
            cacheMap.forEach((song, folderName) => {
                if (!currentFolderNames.has(folderName)) {
                    deletedCount++;
                }
            });
        }

        let processedCount = 0;
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            const songPath = path.join(folderPath, entry.name);
            
            // Check if this song exists in cache
            const cachedSong = cacheMap.get(entry.name);
            if (cachedSong) {
                // Verify the folder still exists and audio file is accessible
                try {
                    await fs.access(cachedSong.audioFile);
                    // Reuse cached song data
                    songs.push(cachedSong);
                    reusedCount++;
                    processedCount++;
                    if (eventSender && eventSender.send && !eventSender.isDestroyed())
                        eventSender.send('scan-progress', { current: processedCount, total: totalSongs });
                    continue;
                } catch {
                    // File doesn't exist anymore, rescan this song
                    console.log('[Scan] Cache miss for', entry.name, '- rescanning');
                }
            }
            
            // This is a new song to scan
            newCount++;
            let files;

            try {
                files = await fs.readdir(songPath);
            } catch {
                processedCount++;
                if (eventSender && eventSender.send && !eventSender.isDestroyed())
                    eventSender.send('scan-progress', { current: processedCount, total: totalSongs });
                continue;
            }

            const osuFiles = files.filter(f => f.endsWith('.osu'));
            const imageFiles = files.filter(f => /\.(jpg|jpeg|png|gif|bmp)$/i.test(f));

            if (osuFiles.length > 0) {
                const osuFilePath = path.join(songPath, osuFiles[0]);
                const osuContent = await fs.readFile(osuFilePath, 'utf-8');
                const osuMetadata = parseOsuFile(osuContent);

                // 🔍 Try to find correct audio filename
                let audioFileName = osuMetadata.audioFilename;
                let audioFilePath = null;
                const supportedExts = ['.mp3', '.ogg', '.wav', '.flac'];

                if (audioFileName) {
                    // Try to find file case-insensitively
                    const found = files.find(f => f.toLowerCase() === audioFileName.toLowerCase());
                    if (found) audioFilePath = path.join(songPath, found);
                }

                // Fallback: find first valid audio file
                if (!audioFilePath) {
                    const audioFiles = files.filter(f => supportedExts.some(ext => f.toLowerCase().endsWith(ext)));
                    if (audioFiles.length > 0) audioFilePath = path.join(songPath, audioFiles[0]);
                    audioFileName = audioFiles[0] || null;
                }

                if (audioFilePath) {
                    let audioMetadata = null;
                    let embeddedImage = null;
                    let duration = null;

                    try {
                        audioMetadata = await parseFile(audioFilePath);
                        duration = audioMetadata.format.duration || null;

                        if (audioMetadata.common.picture?.length > 0) {
                            const picture = audioMetadata.common.picture[0];
                            embeddedImage = {
                                data: picture.data,
                                format: picture.format,
                                description: picture.description
                            };
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
                        const ext = embeddedImage.format === 'image/png' ? 'png' : 'jpg';
                        const embeddedImagePath = path.join(songPath, `embedded_cover.${ext}`);
                        try {
                            await fs.writeFile(embeddedImagePath, embeddedImage.data);
                            imageFile = embeddedImagePath;
                            imageFileName = `embedded_cover.${ext}`;
                        } catch (err) {
                            console.error('Error saving embedded image:', err);
                        }
                    }

                    // Try to infer beatmapSetId if missing
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
                            audioMetadata?.common?.artists?.join(', ') ||
                            'Unknown Artist',
                        album: audioMetadata?.common?.album || null,
                        audioFile: audioFilePath,
                        audioFileName,
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
            }

            processedCount++;
            if (eventSender && eventSender.send && !eventSender.isDestroyed())
                eventSender.send('scan-progress', { current: processedCount, total: totalSongs });
        }

        // Log scan statistics
        console.log(`[Scan] Complete - Total: ${songs.length}, Reused: ${reusedCount}, New: ${newCount}, Deleted: ${deletedCount}`);

        return { 
            success: true, 
            songs,
            stats: {
                total: songs.length,
                reused: reusedCount,
                new: newCount,
                deleted: deletedCount
            }
        };
    } catch (error) {
        console.error('Error scanning folder:', error);
        return { success: false, error: error.message || String(error) };
    }
}
