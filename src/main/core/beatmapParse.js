import path from 'path';
import fs from 'fs/promises';
import { BeatmapDecoder } from 'osu-parsers';
import parseOsuFile from './parseOsu.js';
import { parseTimingPoints, parseBreakSections, buildDifficultyPointsFromTiming, computeKiaiSections, parseComboColors, findAudioFilename } from './beatmap-utils.js';

async function parseBeatmap(folderPath) {
  try {
    console.log('[BeatmapParser] Starting parse from folder:', folderPath);
    
    const files = await fs.readdir(folderPath);
    console.log('[BeatmapParser] Found files:', files.length);

    const result = {
      metadata: null,
      audioBase64: null,
      audioFilename: null,
      backgroundBase64: null,
      backgroundFilename: null,
      osuContent: null
    };

    // Audio for the primary .osu will be set after the loop using that .osu's AudioFilename
    let primaryAudioFilename = null;
    // Fallback: first audio file found in folder if primary's AudioFilename is missing
    let firstAudioFilename = null;

    // Collect .osu filenames (multiple difficulties) and read files from folder
    const osuFilesList = [];
    for (const filename of files) {
      const filepath = path.join(folderPath, filename);
      
      try {
        const stat = await fs.stat(filepath);
        if (!stat.isFile()) continue;
        
        // .osu file — collect all and keep first as the active one
        if (filename.endsWith('.osu')) {
          try {
            const content = await fs.readFile(filepath, 'utf-8');
            // parse .osu for audio filename when available so UI can show per-difficulty audio
            let parsedAudio = null;
            try {
              const parsed = parseOsuFile(content);
              parsedAudio = parsed?.audioFilename || null;
            } catch (pe) {
              parsedAudio = null;
            }
            // Keep first .osu as primary content (existing behavior)
            if (!result.osuContent) {
              console.log('[BeatmapParser] Found .osu file (primary):', filename);
              result.osuContent = content;
              primaryAudioFilename = parsedAudio;
            } else {
              console.log('[BeatmapParser] Found additional .osu file:', filename);
            }
            // Try to extract human-readable difficulty/version from file
            const versionMatch = content.match(/^Version:\s*(.+)$/m);
            const version = versionMatch ? versionMatch[1].trim() : filename.replace(/\.osu$/i, '');
            osuFilesList.push({ filename, version, audioFilename: parsedAudio });
          } catch (readErr) {
            console.warn('[BeatmapParser] Failed to read .osu file:', filename, readErr.message);
          }
          continue;
        }
        
        // Remember first audio file for fallback; do not assign to result yet (use primary .osu's AudioFilename)
        if (/\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(filename)) {
          if (!firstAudioFilename) firstAudioFilename = filename;
          continue;
        }
        
        // Background image (any image file, prefer ones with 'background' in name)
        if (/\.(png|jpg|jpeg)$/i.test(filename) && !result.backgroundBase64) {
          console.log('[BeatmapParser] Found image file:', filename);
          const buffer = await fs.readFile(filepath);
          // Skip small images (likely hitcircles/UI elements)
          if (buffer.length > 50000) {
            result.backgroundBase64 = buffer.toString('base64');
            result.backgroundFilename = filename;
            console.log('[BeatmapParser] Using as background:', filename, 'size:', buffer.length);
          }
          continue;
        }

      } catch (err) {
        console.warn('[BeatmapParser] Failed to read file:', filename, err.message);
        continue;
      }
    }

    // Load audio from the primary .osu's AudioFilename so sound matches the loaded difficulty
    const audioToLoad = findAudioFilename(files, primaryAudioFilename) || firstAudioFilename;
    if (audioToLoad) {
      try {
        const buffer = await fs.readFile(path.join(folderPath, audioToLoad));
        result.audioBase64 = buffer.toString('base64');
        result.audioFilename = audioToLoad;
        console.log('[BeatmapParser] Using audio from primary .osu:', audioToLoad, primaryAudioFilename ? '(from AudioFilename)' : '(fallback first audio)');
      } catch (err) {
        console.warn('[BeatmapParser] Failed to read audio file:', audioToLoad, err.message);
      }
    }

    // Expose discovered difficulties for preview UI (if multiple .osu files exist)
    if (osuFilesList.length > 0) result.availableDifficulties = osuFilesList; else result.availableDifficulties = [];
    if (!result.osuContent) {
      throw new Error('No .osu file found in archive');
    }

    // Parse .osu content
    console.log('[BeatmapParser] Parsing .osu content...');
    result.metadata = parseBeatmapContent(result.osuContent);
    console.log('[BeatmapParser] Parsed:', result.metadata.title, 'by', result.metadata.artist);
    console.log('[BeatmapParser] Objects:', result.metadata.objects?.length);

    // Attach any sample files collected from the beatmap folder into metadata for renderer
    // sampleFiles removed (hitsound/sample collection deleted)

    // stable star calculation removed — computedStars fields intentionally omitted

    return result;
  } catch (error) {
    console.error('[BeatmapParser] Error:', error);
    throw error;
  }
}

/**
 * Parse .osu file content
 * @param {string} osuContent - The .osu file text content
 * @returns {Object} Parsed metadata
 */
function parseBeatmapContent(osuContent) {
  try {
    // Use osu-parsers to properly parse the beatmap
    console.log('[BeatmapParser] Using osu-parsers to decode beatmap...');
    const decoder = new BeatmapDecoder();
    const beatmap = decoder.decodeFromString(osuContent);
    
    console.log('[BeatmapParser] Decoded beatmap:', beatmap.metadata.title);
    console.log('[BeatmapParser] Total hit objects:', beatmap.hitObjects.length);

    // timing/break parsing moved to `core/beatmap-utils.js` — use parseTimingPoints(osuContent) / parseBreakSections(osuContent)

    // parseBreakSections moved to `core/beatmap-utils.js` — use shared helpers below
    const parsedTimingPoints = parseTimingPoints(osuContent);
    const parsedBreakSections = parseBreakSections(osuContent);

    const metadata = {
      title: beatmap.metadata.title || '',
      artist: beatmap.metadata.artist || '',
      creator: beatmap.metadata.creator || '',
      version: beatmap.metadata.version || '',
      // game mode: prefer parser-provided value, fallback to 0
      mode: (typeof beatmap.metadata?.mode === 'number') ? beatmap.metadata.mode : (() => {
        const mm = osuContent.match(/^\s*Mode:\s*(\d+)/m);
        return mm ? parseInt(mm[1], 10) : 0;
      })(),
      // keep old difficulty field for backward-compat, but also expose explicit stats
      difficulty: beatmap.difficulty.overallDifficulty || 0,
      cs: (beatmap.difficulty && (beatmap.difficulty.circleSize ?? beatmap.difficulty.cs)) ?? 0,
      ar: (beatmap.difficulty && (beatmap.difficulty.approachRate ?? beatmap.difficulty.ar)) ?? 0,
      od: (beatmap.difficulty && (beatmap.difficulty.overallDifficulty ?? beatmap.difficulty.od)) ?? 0,
      hp: (beatmap.difficulty && (beatmap.difficulty.drainRate ?? beatmap.difficulty.hp)) ?? 0,
      // slider config (defaults compatible with osu!)
      sliderMultiplier: (beatmap.difficulty && (beatmap.difficulty.sliderMultiplier)) ?? 1.4,
      sliderTickRate: (beatmap.difficulty && (beatmap.difficulty.sliderTickRate)) ?? 1,
      objects: [],
      timingPoints: [],
      difficultyPoints: [],
      kiaiSections: [],
      breakSections: parsedBreakSections,
      comboColors: [],
    };

  // Extract combo colors
  if (beatmap.colours && beatmap.colours.comboColours) {
    metadata.comboColors = beatmap.colours.comboColours.map(color => 
      `rgb(${color.red},${color.green},${color.blue})`
    );
  }

  // buildDifficultyPointsFromTiming moved to `core/beatmap-utils.js`

  // Extract timing points (prefer raw .osu data for kiai/effects flags)
  if (parsedTimingPoints.length > 0) {
    metadata.timingPoints = parsedTimingPoints.map(tp => ({
      time: tp.time,
      beatLength: tp.beatLength,
      uninherited: tp.uninherited,
      effects: tp.effects,
      kiai: tp.kiai,
    }));
    metadata.difficultyPoints = buildDifficultyPointsFromTiming(parsedTimingPoints);
  } else if (beatmap.controlPoints && beatmap.controlPoints.timingPoints) {
    metadata.timingPoints = beatmap.controlPoints.timingPoints.map(tp => ({
      time: tp.startTime,
      beatLength: tp.beatLength,
      uninherited: true,
      effects: 0,
      kiai: false,
    }));
    if (beatmap.controlPoints.difficultyPoints) {
      metadata.difficultyPoints = beatmap.controlPoints.difficultyPoints.map(dp => ({
        time: dp.startTime,
        sliderVelocity: dp.sliderVelocity
      }));
    }
  }

  // Extract hit objects with slider path data
  let sliderCount = 0;
  let circleCount = 0;
  let spinnerCount = 0;
  
  // Debug first object
  if (beatmap.hitObjects.length > 0) {
    const firstObj = beatmap.hitObjects[0];
    console.log('[BeatmapParser] First object properties:', Object.keys(firstObj));
    console.log('[BeatmapParser] First object type check:', {
      isSlider: firstObj.isSlider,
      isCircle: firstObj.isCircle,
      isSpinner: firstObj.isSpinner,
      hasPath: !!firstObj.path,
      constructor: firstObj.constructor.name
    });
  }
  
  let lastObjectEndTime = 0;
  for (let hoIndex = 0; hoIndex < beatmap.hitObjects.length; hoIndex++) {
    const hitObject = beatmap.hitObjects[hoIndex];

    // extract sample-related info from decoded hitObject (best-effort; field names vary by parser)
    const extractSampleInfo = (ho) => {
      const info = {};
      // common properties returned by different decoders
      info.hitSound = ho.hitSound ?? ho.hitsound ?? ho.hit_sound ?? undefined;
      info.sampleSet = ho.sampleSet ?? ho.sampleSetId ?? ho.sampleBank ?? (ho.samples && ho.samples[0] && (ho.samples[0].set ?? ho.samples[0].bank)) ?? undefined;
      info.additionSet = ho.additionSet ?? ho.addition_set ?? (ho.samples && ho.samples[0] && ho.samples[0].additionSet) ?? undefined;
      info.sampleIndex = ho.sampleIndex ?? ho.sample_index ?? (ho.samples && ho.samples[0] && ho.samples[0].index) ?? undefined;
      info.sampleVolume = ho.sampleVolume ?? ho.sample_volume ?? (ho.samples && ho.samples[0] && ho.samples[0].volume) ?? undefined;
      // sampleFileName and node-specific sample parsing removed (hitsound system deleted)
      return info;
    };

    const sInfo = extractSampleInfo(hitObject);

    // Normalize parser-provided sampleVolume: treat explicit 0 as "unspecified"
    let sampleVolumeVal = sInfo.sampleVolume;
    if (typeof sampleVolumeVal === 'number' && sampleVolumeVal === 0) sampleVolumeVal = undefined;

    const obj = {
      x: hitObject.startX,
      y: hitObject.startY,
      time: hitObject.startTime,
      type: 0, // We'll set this manually
      // attach sample metadata (if available)
      sampleSet: sInfo.sampleSet,
      additionSet: sInfo.additionSet,
      sampleIndex: sInfo.sampleIndex,
      sampleVolume: sampleVolumeVal,
      hitSound: sInfo.hitSound
    };
    // Check object type - use constructor name or path presence since isSlider doesn't exist
    const isSlider = hitObject.constructor.name === 'SlidableObject' || 
                     (hitObject.path && hitObject.repeats !== undefined);
    const isSpinner = hitObject.constructor.name === 'Spinner' || hitObject.constructor.name === 'SpinnableObject';
    
    if (isSlider) {
      sliderCount++;
      obj.type |= 2; // Slider flag
      
      // Check for new combo
      if (hitObject.isNewCombo) {
        obj.type |= 4;
      }

      // Extract slider-specific data
      const slider = hitObject;
      obj.curveType = slider.path.controlPoints[0]?.type || 'L';
      obj.slides = slider.repeats + 1; // repeats doesn't include the first slide
      obj.length = slider.path.distance;
      obj.endTime = slider.endTime; // Add slider end time
      lastObjectEndTime = Math.max(lastObjectEndTime, obj.endTime || obj.time);

      // slider node-sample parsing removed (hitsound/node-sample support deleted)
      
      // Extract curve points (excluding the first point which is the start position)
      obj.curvePoints = [];
      for (let i = 0; i < slider.path.controlPoints.length; i++) {
        const cp = slider.path.controlPoints[i];
        obj.curvePoints.push({
          x: cp.position.x,
          y: cp.position.y,
        });
      }

      // Calculate accurate slider path (pre-calculated points with cumulative distances)
      obj.calculatedPath = slider.path.calculatedPath.map(vec => ({
        x: vec.x,
        y: vec.y,
      }));

      // Access private _cumulativeLength property for accurate positioning
      if (slider.path._cumulativeLength) {
        obj.cumulativeLength = Array.from(slider.path._cumulativeLength);
      } else {
        obj.cumulativeLength = [];
      }

      // Precompute endPos (use calculatedPath when available, else fall back to curvePoints)
      if (obj.calculatedPath && obj.calculatedPath.length > 0) {
        const last = obj.calculatedPath[obj.calculatedPath.length - 1];
        obj.endPos = { x: obj.x + last.x, y: obj.y + last.y };
      } else if (obj.curvePoints && obj.curvePoints.length > 0) {
        const lastCp = obj.curvePoints[obj.curvePoints.length - 1];
        obj.endPos = { x: lastCp.x, y: lastCp.y };
      } else {
        obj.endPos = { x: obj.x, y: obj.y };
      }

      // --- Compute slider tick times (approximate osu! logic using SliderMultiplier & tick rate)
      // time per pixel = beatLength / (sliderMultiplier * currentSV)
      try {
        const sliderMultiplier = metadata.sliderMultiplier || 1.4;
        const sliderTickRate = metadata.sliderTickRate || 1;
        const sliderLength = obj.length || 0;
        const slides = obj.slides || 1;
        const fullDuration = (obj.endTime - obj.time) || 0;
        const slideDuration = fullDuration / Math.max(1, slides);

        // determine current slider velocity (SV) from difficultyPoints (fallback 1.0)
        let currentSV = 1.0;
        if (metadata.difficultyPoints && metadata.difficultyPoints.length) {
          for (const dp of metadata.difficultyPoints) {
            if (dp.time <= obj.time && Number.isFinite(dp.sliderVelocity)) currentSV = dp.sliderVelocity;
            else if (dp.time > obj.time) break;
          }
        }

        const tickDistancePx = (sliderMultiplier * currentSV) / Math.max(1, sliderTickRate);
        obj.tickTimes = [];
        if (tickDistancePx > 0 && sliderLength > 0) {
          // distances along slider path where ticks occur (exclude 0 and end)
          const distances = [];
          for (let d = tickDistancePx; d < sliderLength - 0.0001; d += tickDistancePx) distances.push(d);

          for (let rep = 0; rep < slides; rep++) {
            const slideStart = obj.time + rep * slideDuration;
            for (const dist of distances) {
              const proportion = Math.max(0, Math.min(1, dist / sliderLength));
              const t = slideStart + proportion * slideDuration;
              obj.tickTimes.push(Math.round(t));
            }
          }
          // dedupe & sort
          obj.tickTimes = Array.from(new Set(obj.tickTimes)).sort((a, b) => a - b);
        }
      } catch (err) {
        // ignore tick calc errors
      }
      
      // Debug first slider
      if (sliderCount === 1) {
        console.log('[BeatmapParser] First slider:', {
          curveType: obj.curveType,
          slides: obj.slides,
          length: obj.length,
          curvePoints: obj.curvePoints.length,
          calculatedPath: obj.calculatedPath.length,
          cumulativeLength: obj.cumulativeLength.length,
          endPos: obj.endPos
        });
      }
    } else if (isSpinner) {
      spinnerCount++;
      obj.type |= 8; // Spinner flag
      obj.endTime = hitObject.endTime;
      lastObjectEndTime = Math.max(lastObjectEndTime, obj.endTime || obj.time);
      
      if (hitObject.isNewCombo) {
        obj.type |= 4;
      }
    } else {
      // Hit circle
      circleCount++;
      obj.type |= 1;
      lastObjectEndTime = Math.max(lastObjectEndTime, obj.time);
      
      if (hitObject.isNewCombo) {
        obj.type |= 4;
      }
    }

    metadata.objects.push(obj);
  }
  
  console.log('[BeatmapParser] Object counts:', {
    total: metadata.objects.length,
    circles: circleCount,
    sliders: sliderCount,
    spinners: spinnerCount
  });

  // Build kiai sections using shared logic
  if (metadata.timingPoints.length > 0) {
    metadata.kiaiSections = computeKiaiSections(metadata.timingPoints, lastObjectEndTime);
  }

  return metadata;
  } catch (error) {
    console.error('[BeatmapParser] Error using osu-parsers:', error.message);
    console.log('[BeatmapParser] Falling back to manual parsing...');
    // Fallback to simple manual parsing
    return parseBeatmapContentManual(osuContent);
  }
}

// Compute stable star rating for a given .osu content (exposed so caller can reuse)


/**
 * Fallback manual parser (original simple version)
 */
function parseBeatmapContentManual(osuContent) {
  const lines = osuContent.split('\n');
  const metadata = {
    title: '',
    artist: '',
    creator: '',
    version: '',
    difficulty: 0,
    objects: [],
    timingPoints: [],
    difficultyPoints: [],
    kiaiSections: [],
    breakSections: [],
    comboColors: [],
  };

  let section = '';

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('[')) {
      section = trimmed.slice(1, -1);
      continue;
    }

    if (section === 'Metadata') {
      if (trimmed.startsWith('Title:')) {
        metadata.title = trimmed.split('Title:')[1]?.trim() || '';
      }
      if (trimmed.startsWith('Artist:')) {
        metadata.artist = trimmed.split('Artist:')[1]?.trim() || '';
      }
      if (trimmed.startsWith('Creator:')) {
        metadata.creator = trimmed.split('Creator:')[1]?.trim() || '';
      }
      if (trimmed.startsWith('Version:')) {
        metadata.version = trimmed.split('Version:')[1]?.trim() || '';
      }
    }

      if (section === 'Difficulty') {
      if (trimmed.startsWith('CircleSize:')) {
        metadata.cs = parseFloat(trimmed.split('CircleSize:')[1]?.trim() || '0');
      }
      if (trimmed.startsWith('ApproachRate:')) {
        metadata.ar = parseFloat(trimmed.split('ApproachRate:')[1]?.trim() || '0');
      }
      if (trimmed.startsWith('OverallDifficulty:')) {
        metadata.od = parseFloat(trimmed.split('OverallDifficulty:')[1]?.trim() || '0');
        metadata.difficulty = metadata.od;
      }
      if (trimmed.startsWith('HPDrainRate:')) {
        metadata.hp = parseFloat(trimmed.split('HPDrainRate:')[1]?.trim() || '0');
      }
    }

    if (section === 'Colours') {
      const match = trimmed.match(/Combo(\d+)\s*:\s*(\d+),(\d+),(\d+)/);
      if (match) {
        metadata.comboColors.push(`rgb(${match[2]},${match[3]},${match[4]})`);
      }
    }

    if (section === 'HitObjects') {
      const parts = trimmed.split(',');
      if (parts.length >= 5) {
        const obj = {
          x: parseInt(parts[0]),
          y: parseInt(parts[1]),
          time: parseInt(parts[2]),
          type: parseInt(parts[3]),
        };

        // Check if it's a slider (type & 2)
        if (obj.type & 2) {
          // Slider format: x,y,time,type,hitSound,curveType|curvePoints,slides,length
          if (parts.length >= 8) {
            const curveData = parts[5].split('|');
            obj.curveType = curveData[0]; // L, P, B, or C
            obj.curvePoints = [];
            
            // Parse curve points
            for (let i = 1; i < curveData.length; i++) {
              const coords = curveData[i].split(':');
              if (coords.length === 2) {
                obj.curvePoints.push({
                  x: parseInt(coords[0]),
                  y: parseInt(coords[1])
                });
              }
            }
            
            obj.slides = parseInt(parts[6]) || 1;
            obj.length = parseFloat(parts[7]) || 0;
            obj.calculatedPath = [];
            obj.cumulativeLength = [];
            
            // Calculate approximate end time (rough estimate without timing points)
            // Average slider velocity is about 1.4 * 100 pixels per beat
            // We'll use a simplified formula: duration ≈ length * slides
            const approximateDuration = (obj.length * obj.slides) / 100 * 150; // ms
            obj.endTime = obj.time + approximateDuration;

            // Approximate endPos for manual-parsed sliders: prefer last curve point if available
            if (obj.calculatedPath && obj.calculatedPath.length > 0) {
              const lp = obj.calculatedPath[obj.calculatedPath.length - 1];
              obj.endPos = { x: obj.x + lp.x, y: obj.y + lp.y };
            } else if (obj.curvePoints && obj.curvePoints.length > 0) {
              const lastCp = obj.curvePoints[obj.curvePoints.length - 1];
              obj.endPos = { x: lastCp.x, y: lastCp.y };
            } else {
              obj.endPos = { x: obj.x, y: obj.y };
            }
          }
        }
        
        // Check if it's a spinner (type & 8)
        if (obj.type & 8) {
          // Spinner format: x,y,time,type,hitSound,endTime
          if (parts.length >= 6) {
            obj.endTime = parseInt(parts[5]) || obj.time;
          }
        }

        metadata.objects.push(obj);
      }
    }



    if (section === 'Events') {
      const parts = trimmed.split(',');
      if (parts.length >= 3) {
        const eventType = parseInt(parts[0], 10);
        if (eventType === 2) {
          const startTime = parseInt(parts[1], 10);
          const endTime = parseInt(parts[2], 10);
          if (Number.isFinite(startTime) && Number.isFinite(endTime) && endTime > startTime) {
            metadata.breakSections.push({ startTime, endTime });
          }
        }
      }
    }
  }
  
  // Use shared timing parsing & difficulty points
  if (!metadata.timingPoints || metadata.timingPoints.length === 0) {
    metadata.timingPoints = parseTimingPoints(osuContent);
    metadata.difficultyPoints = buildDifficultyPointsFromTiming(metadata.timingPoints);
  }

  // Build kiai sections using shared logic
  if (metadata.timingPoints.length > 0) {
    const lastObjectEndTime = metadata.objects.reduce((maxTime, obj) => {
      const endTime = obj.endTime || obj.time || 0;
      return Math.max(maxTime, endTime);
    }, 0);
    metadata.kiaiSections = computeKiaiSections(metadata.timingPoints, lastObjectEndTime);
  }

  // Fallback to parse combo colours if none found during manual parsing
  if (metadata.comboColors.length === 0) {
    metadata.comboColors = parseComboColors(osuContent);
  }

  console.log('[BeatmapParser] Manual parsing complete, objects:', metadata.objects.length);

  return metadata;
}

export { parseBeatmap, parseBeatmapContent };
