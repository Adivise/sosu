export default function parseOsuFile(content) {
    const metadata = {
        title: null,
        artist: null,
        audioFilename: null,
        bpm: null,
        difficulty: null,
        beatmapSetId: null,
        beatmapId: null
    };

    const lines = content.split('\n');
    let inMetadata = false;

    for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed === '[Metadata]') {
            inMetadata = true;
            continue;
        }

        if (trimmed.startsWith('[') && trimmed !== '[Metadata]') {
            inMetadata = false;
            continue;
        }

        if (inMetadata) {
            if (trimmed.startsWith('AudioFilename:')) {
                metadata.audioFilename = trimmed.substring(14).trim();
            } else if (trimmed.startsWith('Title:')) {
                metadata.title = trimmed.substring(6).trim();
            } else if (trimmed.startsWith('Artist:')) {
                metadata.artist = trimmed.substring(7).trim();
            } else if (trimmed.startsWith('Version:')) {
                metadata.difficulty = trimmed.substring(8).trim();
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

    // Try to extract BPM from timing section or inline
    const bpmMatch = content.match(/BPM:\s*(\d+\.?\d*)/i);
    if (bpmMatch) metadata.bpm = parseFloat(bpmMatch[1]);

    return metadata;
}