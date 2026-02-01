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
        mode: null,
        beatmapSetId: null,
        beatmapId: null
    };

    const lines = content.split('\n');
    let inMetadata = false;
    let inTimingPoints = false;
    let maxBpm = 0;
    let minBpm = Infinity;
    let firstBpm = null; // the first uninherited timing point BPM (osu! style)

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
            // set a small flag to allow parsing Mode lines below
            continue;
        }

        // Parse game mode if present (Mode: 0,1,2,3)
        if (trimmed.startsWith('Mode:')) {
            const m = parseInt(trimmed.split(':')[1]?.trim());
            metadata.mode = isNaN(m) ? null : m;
        }

        if (trimmed.startsWith('[') && trimmed !== '[Metadata]' && trimmed !== '[TimingPoints]') {
            inMetadata = false;
            inTimingPoints = false;
            continue;
        }

        if (inMetadata) {
            if (trimmed.startsWith('AudioFilename:')) {
                metadata.audioFilename = trimmed.substring(14).trim();
            } else if (trimmed.startsWith('Title:')) {
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

        // Parse timing points for BPM: collect max BPM from uninherited timing points
        if (inTimingPoints) {
            if (!trimmed) continue;
            // timing lines are CSV: time,beatLength,meters,sampleSet,sampleIndex,volume,uninherited,effects
            const parts = trimmed.split(',').map(p => p.trim());
            if (parts.length >= 2) {
                const beatLength = parseFloat(parts[1]);
                // Determine uninherited flag if present (index 6)
                const uninherited = parts.length >= 7 ? parseInt(parts[6]) : 1;
                if (!isNaN(beatLength) && beatLength > 0 && (uninherited === 1 || uninherited === undefined)) {
                    const bpm = 60000 / beatLength;
                    // Capture first uninherited BPM (osu! default behavior)
                    if (firstBpm === null) firstBpm = bpm;
                    if (bpm > maxBpm) maxBpm = bpm;
                    if (bpm < minBpm) minBpm = bpm;
                    // continue scanning to find the min/max BPM across timing points
                }
            }
        }
    }

    // If we found timing-point BPMs, use the min/max BPM found
    if (maxBpm > 0) {
        metadata.bpmMin = minBpm === Infinity ? maxBpm : minBpm;
        metadata.bpmMax = maxBpm;
        // For osu! compatibility use the first uninherited timing point BPM as 'bpm'
        metadata.bpm = firstBpm || metadata.bpmMax;
    } else {
        // Fallback: Try to extract BPM from inline text if timing points didn't provide it
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