import { parseTimingPoints } from './beatmap-utils.js';

export default function parseOsuFile(content) {
    const metadata = {
        title: null,
        titleUnicode: null,
        artist: null,
        artistUnicode: null,
        creator: null,
        audioFilename: null,
        bpm: null,
        difficulty: null,
        version: null,
        mode: 0, // Default to osu! standard mode
        beatmapSetId: null,
        beatmapId: null
    };

    const lines = content.split('\n');
    let inMetadata = false;
    // Track current section so we can correctly parse fields
    let inTimingPoints = false;

    for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed === '[Metadata]') {
            inMetadata = true;
            inTimingPoints = false;
            continue;
        }

        if (trimmed === '[TimingPoints]') {
            inTimingPoints = true;
            inMetadata = false;
            continue;
        }

        // Some files put Mode in [General] section.
        if (trimmed === '[General]') {
            inMetadata = false;
            inTimingPoints = false;
            continue;
        }

        // Parse game mode if present (Mode: 0,1,2,3)
        if (trimmed.startsWith('Mode:')) {
            const m = parseInt(trimmed.split(':')[1]?.trim());
            metadata.mode = isNaN(m) ? 0 : m; // Default to 0 if invalid
        }

        // AudioFilename is officially defined in the [General] section in osu! format.
        // Some maps (or older tools) may also place it elsewhere, so we parse it
        // whenever we see the key, as long as we're not inside [TimingPoints].
        if (!inTimingPoints && trimmed.startsWith('AudioFilename:')) {
            metadata.audioFilename = trimmed.substring('AudioFilename:'.length).trim();
        }

        if (trimmed.startsWith('[') && trimmed !== '[Metadata]' && trimmed !== '[TimingPoints]') {
            inMetadata = false;
            inTimingPoints = false;
            continue;
        }

        if (inMetadata) {
            if (trimmed.startsWith('Title:')) {
                metadata.title = trimmed.substring(6).trim();
            } else if (trimmed.startsWith('TitleUnicode:')) {
                metadata.titleUnicode = trimmed.substring(13).trim();
            } else if (trimmed.startsWith('Artist:')) {
                metadata.artist = trimmed.substring(7).trim();
            } else if (trimmed.startsWith('ArtistUnicode:')) {
                metadata.artistUnicode = trimmed.substring(14).trim();
            } else if (trimmed.startsWith('Creator:')) {
                metadata.creator = trimmed.substring(8).trim();
            } else if (trimmed.startsWith('Version:')) {
                metadata.difficulty = trimmed.substring(8).trim();
                metadata.version = metadata.difficulty;
            } else if (trimmed.startsWith('BeatmapSetID:')) {
                metadata.beatmapSetId = parseInt(trimmed.substring(13).trim()) || null;
            } else if (trimmed.startsWith('BeatmapID:')) {
                metadata.beatmapId = parseInt(trimmed.substring(10).trim()) || null;
            }
        }
        if (trimmed.startsWith('ApproachRate:') || trimmed.startsWith('OverallDifficulty:')) {
            metadata.difficulty = metadata.difficulty || trimmed.split(':')[1]?.trim();
        }
    }

    // Use shared timing-points parser to determine BPM
    const parsedTimingPoints = parseTimingPoints(content);
    const uninherited = parsedTimingPoints.filter(tp => tp.uninherited !== false && tp.beatLength > 0);
    if (uninherited.length > 0) {
        const bpms = uninherited.map(tp => 60000 / tp.beatLength);
        metadata.bpmMin = Math.min(...bpms);
        metadata.bpmMax = Math.max(...bpms);
        const firstUninherited = uninherited.sort((a, b) => a.time - b.time)[0];
        metadata.bpm = 60000 / firstUninherited.beatLength;
    } else {
        const bpmMatch = content.match(/BPM:\s*(\d+\.?\d*)/i);
        if (bpmMatch) {
            const v = parseFloat(bpmMatch[1]);
            metadata.bpm = v;
            metadata.bpmMin = v;
            metadata.bpmMax = v;
        }
    }

    return metadata;
}