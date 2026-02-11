export const getFilterStats = ({
  songs,
  songDurations,
  minDurationValue,
  hiddenArtists,
  nameFilter,
  nameFilterMode,
  dedupeTitlesEnabled
}) => {
  const list = Array.isArray(songs) ? songs : [];
  const hidden = Array.isArray(hiddenArtists) ? hiddenArtists : [];

  const totalSongs = list.length;
  let hiddenCount = 0;
  let hiddenByDuration = 0;
  let hiddenByArtist = 0;
  let hiddenByTitle = 0;
  let duplicateCount = 0;
  const seenTitles = new Set();

  list.forEach((song) => {
    const duration = songDurations?.[song.id] ?? song.duration;
    if (duration && duration < minDurationValue) {
      hiddenCount++;
      hiddenByDuration++;
      return;
    }

    if (hidden.length > 0 && song.artist) {
      const artistLower = song.artist.toLowerCase().trim();
      if (hidden.some((item) => item.toLowerCase().trim() === artistLower)) {
        hiddenCount++;
        hiddenByArtist++;
        return;
      }
    }

    if (nameFilter) {
      const songTitle = (song.title || '').toLowerCase();
      const raw = nameFilter
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      for (const item of raw) {
        const idx = item.indexOf('::');
        const mode = (idx > 0 ? item.slice(0, idx) : nameFilterMode).toLowerCase();
        const term = (idx > 0 ? item.slice(idx + 2) : item).toLowerCase().trim();
        if (!term) continue;

        let hit = false;
        switch (mode) {
          case 'startswith':
            hit = songTitle.startsWith(term);
            break;
          case 'endswith':
            hit = songTitle.endsWith(term);
            break;
          case 'contains':
          default:
            hit = songTitle.includes(term);
            break;
        }

        if (hit) {
          hiddenCount++;
          hiddenByTitle++;
          return;
        }
      }
    }

    const normalizedTitle = (song.title || '').toLowerCase().trim();
    if (normalizedTitle) {
      if (seenTitles.has(normalizedTitle)) {
        duplicateCount++;
      } else {
        seenTitles.add(normalizedTitle);
      }
    }
  });

  const visibleBeforeDedupe = totalSongs - hiddenCount;
  const visibleAfterDedupe = dedupeTitlesEnabled
    ? Math.max(0, visibleBeforeDedupe - duplicateCount)
    : visibleBeforeDedupe;
  const hiddenTotal = totalSongs - visibleAfterDedupe;

  return {
    total: totalSongs,
    hidden: hiddenTotal,
    hiddenBy: {
      duration: hiddenByDuration,
      artist: hiddenByArtist,
      title: hiddenByTitle
    },
    visible: visibleAfterDedupe,
    duplicate: dedupeTitlesEnabled ? duplicateCount : 0
  };
};

export const getCurrentSongs = ({
  currentView,
  songs,
  recentlyPlayed,
  favorites,
  playCounts,
  playlists,
  selectedPlaylistId,
  songDurations,
  minDurationValue,
  hiddenArtists,
  nameFilter,
  nameFilterMode,
  dedupeTitlesEnabled
}) => {
  const list = Array.isArray(songs) ? songs : [];
  const playlistList = Array.isArray(playlists) ? playlists : [];
  const favoritesMap = favorites || {};
  const playCountsMap = playCounts || {};

  let songsToReturn;

  if (currentView === 'songs') {
    songsToReturn = list;
  } else if (currentView === 'recently-played') {
    songsToReturn = Array.isArray(recentlyPlayed) ? recentlyPlayed : [];
  } else if (currentView === 'favorites') {
    songsToReturn = list.filter((song) => favoritesMap[song.id]);
  } else if (currentView === 'most-played') {
    songsToReturn = list
      .filter((song) => playCountsMap[song.id] && playCountsMap[song.id] > 0)
      .sort((a, b) => (playCountsMap[b.id] || 0) - (playCountsMap[a.id] || 0));
  } else {
    songsToReturn = playlistList.find((p) => p.id === selectedPlaylistId)?.songs ?? [];
  }

  const filtered = songsToReturn.filter((song) => {
    const duration = songDurations?.[song.id] ?? song.duration;

    if (duration && duration < minDurationValue) return false;

    if (hiddenArtists?.length > 0 && song.artist) {
      const artistLower = song.artist.toLowerCase().trim();
      if (hiddenArtists.some((hidden) => hidden.toLowerCase().trim() === artistLower)) {
        return false;
      }
    }

    if (nameFilter) {
      const songTitle = (song.title || '').toLowerCase();
      const raw = nameFilter
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      for (const item of raw) {
        const idx = item.indexOf('::');
        const mode = (idx > 0 ? item.slice(0, idx) : nameFilterMode).toLowerCase();
        const term = (idx > 0 ? item.slice(idx + 2) : item).toLowerCase().trim();
        if (!term) continue;

        let hit = false;
        switch (mode) {
          case 'startswith':
            hit = songTitle.startsWith(term);
            break;
          case 'endswith':
            hit = songTitle.endsWith(term);
            break;
          case 'contains':
          default:
            hit = songTitle.includes(term);
            break;
        }

        if (hit) return false;
      }
    }

    return true;
  });

  if (!dedupeTitlesEnabled) return filtered;

  const groups = new Map();

  for (const s of filtered) {
    const normalized = (s.title || '').toLowerCase().trim();
    const key = normalized || `__id__${s.id}`;
    const arr = groups.get(key) || [];
    arr.push(s);
    groups.set(key, arr);
  }

  const processed = new Set();
  const result = [];

  for (const s of filtered) {
    const normalized = (s.title || '').toLowerCase().trim();
    const key = normalized || `__id__${s.id}`;
    if (processed.has(key)) continue;

    const group = groups.get(key) || [s];
    if (group.length === 1) {
      result.push(s);
    } else {
      const scored = group
        .map((song) => {
          let score = 0;
          if (song.imageFile) score += 30;
          if (song.beatmapSetId) score += 25;
          if (song.artist && song.artist !== 'Unknown Artist') score += 10;
          if (song.title) score += 5;
          if (song.duration) score += Math.min(10, Math.round(song.duration / 30));
          return { song, score };
        })
        .sort((a, b) => b.score - a.score);

      const canonical = { ...scored[0].song };
      canonical.duplicates = group.filter((x) => x.id !== canonical.id);
      canonical.duplicatesCount = canonical.duplicates.length;
      result.push(canonical);
    }

    processed.add(key);
  }

  return result;
};
