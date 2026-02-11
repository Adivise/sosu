import fs from 'fs/promises';
import path from 'path';
import { parseFile } from 'music-metadata';
import parseOsuFile from '../core/parseOsu.js';
import os from 'os';

// Configuration
const CONCURRENT_SCANS = Math.max(4, Math.min(16, os.cpus().length * 2)); // Number of folders to scan in parallel (dynamic)
const CONCURRENT_METADATA = Math.max(2, Math.min(8, os.cpus().length)); // Number of metadata parsing operations in parallel (dynamic)

/**
 * Process a single song folder
 */
async function processSongFolder(entry, folderPath, cacheMap, cacheFolderMtimes, scanAllMaps = false, preFiles = null, preFolderMtime = null) {
    const songPath = path.join(folderPath, entry.name);
    
    // Check if this song exists in cache
    const cachedSong = cacheMap.get(entry.name);
    if (cachedSong) {
        // Verify the cached song data is still valid
        try {
            // Use pre-provided mtime if available to avoid extra stat
            let currentMtime = preFolderMtime;
            if (currentMtime == null) {
                const folderStat = await fs.stat(songPath);
                if (!folderStat.isDirectory()) throw new Error('Not a directory');
                currentMtime = folderStat.mtime.getTime();
            }
            const cachedMtime = cacheFolderMtimes.get(entry.name);
            
            // If mtime hasn't changed, we can safely reuse cache without checking audio file
            if (cachedMtime && currentMtime === cachedMtime) {
                const updatedSong = { ...cachedSong, mode: cachedSong.mode ?? 0, _folderMtime: currentMtime };
                return { song: updatedSong, reused: true };
            }
            
            // Folder was modified, check if audio file still exists
            const audioFileExists = cachedSong.audioFile ? await fs.access(cachedSong.audioFile).then(() => true).catch(() => false) : false;
            
            if (audioFileExists) {
                // Reuse cached song data but update mtime
                const updatedSong = { ...cachedSong, mode: cachedSong.mode ?? 0, _folderMtime: currentMtime };
                return { song: updatedSong, reused: true };
            } else {
                console.log('[Scan] Audio file missing for', entry.name, '- rescanning');
            }
        } catch (err) {
            // Folder doesn't exist or other error, rescan
            console.log('[Scan] Cache validation failed for', entry.name, ':', err.message);
        }
    }
    
    // This is a new song to scan
    let files = preFiles;
    try {
        if (!files) files = await fs.readdir(songPath);
    } catch {
        return { song: null, reused: false };
    }

    const osuFiles = files.filter(f => f.endsWith('.osu'));
    const imageFiles = files.filter(f => /\.(jpg|jpeg|png|gif|bmp)$/i.test(f));

    if (osuFiles.length === 0) {
        return { song: null, reused: false };
    }

    const osuFilePath = path.join(songPath, osuFiles[0]);
    const osuContent = await fs.readFile(osuFilePath, 'utf-8');
    const osuMetadata = parseOsuFile(osuContent);
    
    // Skip if beatmapId is missing or 0 (unless scanAllMaps is enabled)
    if (!scanAllMaps && (!osuMetadata.beatmapId || osuMetadata.beatmapId === 0)) {
        console.log(`[Scan] Skipping folder "${entry.name}" - beatmapId is ${osuMetadata.beatmapId === null ? 'missing' : '0'}`);
        return { song: null, reused: false, invalidBeatmapId: true };
    }

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

    if (!audioFilePath) {
        return { song: null, reused: false };
    }

    // Try to get folder mtime (use pre-provided if available)
    let folderMtime = preFolderMtime;
    if (folderMtime == null) {
        try {
            const folderStat = await fs.stat(songPath);
            folderMtime = folderStat.mtime.getTime();
        } catch {}
    }

    // Return metadata task (will be processed in parallel batch)
    return {
        metadataTask: {
            audioFilePath,
            audioFileName,
            songPath,
            entry,
            osuMetadata,
            imageFiles,
            files,
            folderMtime
        },
        reused: false
    }; 
}

/**
 * Process metadata for a song (audio parsing, image extraction)
 */
async function processMetadata(metadataTask) {
    const { audioFilePath, audioFileName, songPath, entry, osuMetadata, imageFiles, files } = metadataTask;
    
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

    // Use folder mtime passed from earlier step if available to avoid extra stat
    const folderMtime = metadataTask.folderMtime || null;

    // Use deterministic ID based on folder name + audio filename
    const stableId = `${entry.name}::${audioFileName || 'audio'}`;
    
    return {
        id: stableId,
        folderName: entry.name,
        folderPath: songPath,
        title: osuMetadata.title || audioMetadata?.common?.title || entry.name,
        titleUnicode: osuMetadata.titleUnicode || null,
        artist:
            osuMetadata.artist ||
            audioMetadata?.common?.artist ||
            audioMetadata?.common?.artists?.join(', ') ||
            'Unknown Artist',
        artistUnicode: osuMetadata.artistUnicode || null,
        creator: osuMetadata.creator || audioMetadata?.common?.composer || null,
        audioFilename: osuMetadata.audioFilename || null,
        version: osuMetadata.version || osuMetadata.difficulty || null,
        mode: (typeof osuMetadata.mode === 'number') ? osuMetadata.mode : 0,
        album: audioMetadata?.common?.album || null,
        audioFile: audioFilePath,
        audioFileName,
        imageFile,
        imageFileName,
        duration,
        bpmMin: osuMetadata.bpmMin || null,
        bpmMax: osuMetadata.bpmMax || osuMetadata.bpm || null,
        bpm: osuMetadata.bpmMax || osuMetadata.bpm || null,
        difficulty: osuMetadata.difficulty || null,
        year: audioMetadata?.common?.year || null,
        genre: audioMetadata?.common?.genre?.join(', ') || null,
        beatmapSetId,
        beatmapId: osuMetadata.beatmapId,
        _folderMtime: folderMtime // Internal field for cache optimization
    };
}

/**
 * Process tasks in parallel with concurrency limit
 */
async function processInParallel(tasks, processor, concurrency, onProgress) {
    const results = [];
    const executing = [];
    let completed = 0;
    
    for (const task of tasks) {
        const promise = processor(task).then(result => {
            completed++;
            if (onProgress) onProgress(completed);
            executing.splice(executing.indexOf(promise), 1);
            return result;
        }).catch(err => {
            console.error('[Scan] Error processing task:', err);
            executing.splice(executing.indexOf(promise), 1);
            return null;
        });
        
        results.push(promise);
        executing.push(promise);
        
        // Wait if we've reached concurrency limit
        if (executing.length >= concurrency) {
            await Promise.race(executing);
        }
    }
    
    // Wait for all remaining tasks
    await Promise.all(executing);
    return Promise.all(results);
}

export async function scanOsuFolder(folderPath, eventSender, existingCache = null, scanAllMaps = false) {
    try {
        const songs = [];
        const entries = await fs.readdir(folderPath, { withFileTypes: true });
        
        // Create a map of existing songs by folder name for quick lookup
        const cacheMap = new Map();
        const cacheFolderMtimes = new Map(); // Track folder modification times
        if (existingCache && existingCache.songs) {
            existingCache.songs.forEach(song => {
                if (song.folderName) {
                    // Support both old (folderName) and new (folderName::audioFile) ID formats
                    cacheMap.set(song.folderName, song);
                    
                    // Store cached folder mtime if available
                    if (song._folderMtime) {
                        cacheFolderMtimes.set(song.folderName, song._folderMtime);
                    }
                }
            });
        }

        // Create a set of current folder names to detect deleted songs
        const currentFolderNames = new Set();
        
        // Filter valid folders - now check all folders, not just those starting with numbers
        const validFolders = [];
        const skippedFolders = {
            failed: [],
            noOsuFile: [],
            noAudioFile: [],
            noBothFiles: [],
            readError: [],
            invalidBeatmapId: []
        };
        
        // Check folders in parallel to avoid serial fs operations
        const dirEntries = entries.filter(e => e.isDirectory());
        const checkResults = await processInParallel(
            dirEntries,
            async (entry) => {
                if (entry.name === 'Failed') return { entry, status: 'failed' };
                currentFolderNames.add(entry.name);
                try {
                    const songPath = path.join(folderPath, entry.name);
                    const [files, folderStat] = await Promise.all([fs.readdir(songPath), fs.stat(songPath)]);
                    const osuFiles = files.filter(f => f.endsWith('.osu'));
                    const audioFiles = files.filter(f => /\.(mp3|ogg|wav|flac)$/i.test(f));
                    if (osuFiles.length === 0 && audioFiles.length === 0) return { entry, status: 'noBoth', files, folderMtime: folderStat.mtime.getTime() };
                    if (osuFiles.length === 0) return { entry, status: 'noOsu', files, folderMtime: folderStat.mtime.getTime() };
                    if (audioFiles.length === 0) return { entry, status: 'noAudio', files, folderMtime: folderStat.mtime.getTime() };
                    return { entry, status: 'valid', files, folderMtime: folderStat.mtime.getTime() };
                } catch (err) {
                    return { entry, status: 'readError' };
                }
            },
            CONCURRENT_SCANS
        );

        for (const res of checkResults) {
            if (!res || !res.entry) continue;
            const name = res.entry.name;
            switch (res.status) {
                case 'failed':
                    skippedFolders.failed.push(name);
                    break;
                case 'noBoth':
                    skippedFolders.noBothFiles.push(name);
                    break;
                case 'noOsu':
                    skippedFolders.noOsuFile.push(name);
                    break;
                case 'noAudio':
                    skippedFolders.noAudioFile.push(name);
                    break;
                case 'readError':
                    skippedFolders.readError.push(name);
                    break;
                case 'valid':
                    // Store object with pre-read files and folder mtime to avoid re-reading
                    validFolders.push({ entry: res.entry, files: res.files, folderMtime: res.folderMtime });
                    break;
                default:
                    break;
            }
        } 
        
        // Log skipped folders for debugging
        const totalSkipped = Object.values(skippedFolders).reduce((sum, arr) => sum + arr.length, 0);
        if (totalSkipped > 0) {
            console.log(`[Scan] Skipped ${totalSkipped} folders:`);
            if (skippedFolders.failed.length > 0) {
                console.log(`  - ${skippedFolders.failed.length} "Failed" folders`);
            }
            if (skippedFolders.noOsuFile.length > 0) {
                console.log(`  - ${skippedFolders.noOsuFile.length} folders without .osu files`);
            }
            if (skippedFolders.noAudioFile.length > 0) {
                console.log(`  - ${skippedFolders.noAudioFile.length} folders without audio files`);
            }
            if (skippedFolders.noBothFiles.length > 0) {
                console.log(`  - ${skippedFolders.noBothFiles.length} folders without both .osu and audio files`);
            }
            if (skippedFolders.invalidBeatmapId.length > 0) {
                console.log(`  - ${skippedFolders.invalidBeatmapId.length} folders with invalid or missing beatmapId (0 or null)`);
            }
            if (skippedFolders.readError.length > 0) {
                console.log(`  - ${skippedFolders.readError.length} folders with read errors`);
            }
        }
        
        const totalSongs = validFolders.length;
        
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

        // Process folders in parallel
        let foldersProcessed = 0;
        const folderResults = await processInParallel(
            validFolders,
            (vf) => processSongFolder(vf.entry, folderPath, cacheMap, cacheFolderMtimes, scanAllMaps, vf.files, vf.folderMtime),
            CONCURRENT_SCANS,
            (completed) => {
                foldersProcessed = completed;
                // Send progress: folders processed / total (phase 1: 0-70% of progress)
                // Use weighted progress: folder scanning = 70%, metadata = 30%
                const folderProgress = Math.floor((foldersProcessed / totalSongs) * 0.7 * totalSongs);
                if (eventSender && eventSender.send && !eventSender.isDestroyed())
                    eventSender.send('scan-progress', { current: folderProgress, total: totalSongs });
            }
        );

        // Separate cached songs and metadata tasks
        const metadataTasks = [];
        let cachedSongsCount = 0;
        let invalidBeatmapIdCount = 0;
        for (const result of folderResults) {
            if (result.song) {
                songs.push(result.song);
                if (result.reused) reusedCount++;
                cachedSongsCount++;
            } else if (result.metadataTask) {
                metadataTasks.push(result.metadataTask);
                newCount++;
            } else if (result && result.invalidBeatmapId) {
                invalidBeatmapIdCount++;
            }
        }
        
        // Update skipped folders count for invalid beatmapId (found during processing)
        if (invalidBeatmapIdCount > 0) {
            skippedFolders.invalidBeatmapId = Array(invalidBeatmapIdCount).fill(null);
        }

        // Process metadata in parallel batches
        if (metadataTasks.length > 0) {
            const metadataResults = await processInParallel(
                metadataTasks,
                processMetadata,
                CONCURRENT_METADATA,
                (completed) => {
                    // Continue progress: 70% (folder phase) + 30% (metadata phase)
                    const folderPhaseProgress = Math.floor(totalSongs * 0.7);
                    const metadataPhaseProgress = Math.floor((completed / metadataTasks.length) * totalSongs * 0.3);
                    const totalProgress = folderPhaseProgress + metadataPhaseProgress;
                    if (eventSender && eventSender.send && !eventSender.isDestroyed())
                        eventSender.send('scan-progress', { current: totalProgress, total: totalSongs });
                }
            );
            
            // Filter out null results and add to songs
            for (const song of metadataResults) {
                if (song) {
                    songs.push(song);
                }
            }
        }
        
        // Send final progress
        if (eventSender && eventSender.send && !eventSender.isDestroyed())
            eventSender.send('scan-progress', { current: totalSongs, total: totalSongs });

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
