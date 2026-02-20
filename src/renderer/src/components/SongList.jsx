import React, { useState, useEffect, useRef, useMemo } from 'react';
import SongItem from './SongItem';
import './SongList.css';

const SongList = ({ listRef: listRefProp, songs, onSongSelect, onPreviewSelect = null, currentSong, songDurations, isPlaylist, onRemoveFromPlaylist, allSongs, onAddToPlaylist, playlists, showSongBadges = true, favorites = {}, onToggleFavorite, isPlayingNow = false, itemsPerPage = 50, currentPage: controlledPage, onPageChange, onAddArtistToFilter = null, onOpenSongDetails = null, onOpenBeatmapPreview = null, onClearPreview = null, onCreatePlaylist = null, highlightedSongId = null, playCounts = {}, isMostPlayed = false, viewKey = null }) => {
  const [internalPage, setInternalPage] = useState(1);
  const internalListRef = useRef(null);
  const listRef = listRefProp != null ? listRefProp : internalListRef;
  const scrollContainerRef = useRef(null);
  const isControlled = typeof controlledPage === 'number' && controlledPage > 0;
  const currentPage = isControlled ? controlledPage : internalPage;
  const [songDifficulties, setSongDifficulties] = useState({});

  // Get durations from allSongs if available (for playlist songs)
  const getSongDuration = (song) => {
    if (songDurations[song.id]) return songDurations[song.id];
    if (song.duration) return song.duration;
    // Try to find in allSongs
    if (allSongs) {
      const fullSong = allSongs.find(s => s.id === song.id);
      if (fullSong) {
        if (songDurations[fullSong.id]) return songDurations[fullSong.id];
        return fullSong.duration;
      }
    }
    return null;
  };

  // Restore scroll position when songs change or viewKey changes. Support both controlled and uncontrolled pagination.
  useEffect(() => {
    // Set page to 1 only for uncontrolled pagination
    if (!isControlled) setInternalPage(1);

    // Find the nearest scrollable container (e.g., .main-content-body). Fallback to the list element.
    const scrollEl = listRef.current?.closest?.('.main-content-body') || listRef.current;
    scrollContainerRef.current = scrollEl || null;

    if (scrollEl) {
      try {
        const key = viewKey ? `sosu:scroll:${viewKey}` : null;
        if (key) {
          const saved = sessionStorage.getItem(key);
          if (typeof console !== 'undefined' && console.debug) console.debug('[SongList] restore scroll', { viewKey, key, saved });
          if (saved != null) {
            const val = Math.max(0, Math.min(scrollEl.scrollHeight, parseInt(saved, 10) || 0));
            // Defer to next frame to ensure layout finished
            requestAnimationFrame(() => requestAnimationFrame(() => {
              try { scrollEl.scrollTop = val; if (typeof console !== 'undefined' && console.debug) console.debug('[SongList] applied scrollTop', val); } catch (err) { console.error('[SongList] failed apply scroll', err); }
            }));
            return;
          }
        }
        // fallback: scroll to top
        requestAnimationFrame(() => { try { scrollEl.scrollTop = 0; } catch (err) {} });
      } catch (e) {
        try { scrollEl.scrollTop = 0; } catch (e2) {}
      }
    }
  }, [songs.length, isControlled, viewKey]);

  // Listen for jump requests (from PlayerBar, etc.) to scroll to a specific song
  useEffect(() => {
    const handler = (ev) => {
      try {
        const songId = ev?.detail?.songId;
        if (!songId) return;
        const idx = songs.findIndex(s => s.id === songId);
        if (idx === -1) return;
        const page = Math.floor(idx / itemsPerPage) + 1;
        // Change page (controlled or uncontrolled)
        handlePageChange(page);
        // Wait a tick for the DOM to update, then scroll the item into view
        setTimeout(() => {
          try {
            const el = listRef.current?.querySelector(`[data-song-id="${songId}"]`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              // Ask app to highlight the item briefly
              window.dispatchEvent(new CustomEvent('sosu:highlight-song', { detail: { songId } }));
            }
          } catch (e) {}
        }, 60);
      } catch (err) {}
    };

    window.addEventListener('sosu:jump-to-song', handler);
    return () => window.removeEventListener('sosu:jump-to-song', handler);
  }, [songs, itemsPerPage]);

  // Load difficulties when a song with multiple .osu files is selected
  useEffect(() => {
    if (!currentSong || !currentSong.folderPath || !Array.isArray(currentSong.osuFiles) || currentSong.osuFiles.length <= 1) {
      setSongDifficulties({});
      return;
    }

    // Check if we already loaded difficulties for this song
    if (songDifficulties[currentSong.id]) return;

    // Load difficulties from IPC
    const loadDifficulties = async () => {
      try {
        const result = await window.electronAPI?.getSongDifficulties?.(currentSong.folderPath, currentSong.osuFiles);
        if (result?.success && Array.isArray(result.difficulties)) {
          // Create song objects from difficulties (excluding the current one)
          // Use the same id as currentSong so it doesn't get cleared by the existence check
          const difficultySongs = result.difficulties
            .filter(d => d.filename !== currentSong.osuFiles[0]?.name)
            .map((d) => {
              const audioFile = d.audioFilePath || currentSong.audioFile;
              if (!audioFile) {
                console.warn('[SongList] Difficulty', d.filename, 'has no audio file');
              }
              return {
                ...currentSong,
                id: currentSong.id, // Keep same id to avoid being cleared
                version: d.version,
                audioFilename: d.audioFilename,
                audioFileName: d.audioFilename,
                audioFile, // Use difficulty's audio file
                beatmapId: d.beatmapId,
                beatmapSetId: d.beatmapSetId,
                mode: d.mode,
                // Do NOT carry duplicate metadata into difficulty rows (no badges in OTHER DIFF)
                duplicates: undefined,
                duplicatesCount: 0,
                _difficultyFilename: d.filename
              };
            });
          
          setSongDifficulties(prev => ({
            ...prev,
            [currentSong.id]: difficultySongs
          }));
        }
      } catch (err) {
        console.error('[SongList] Failed to load difficulties:', err);
      }
    };

    loadDifficulties();
  }, [currentSong?.id, currentSong?.folderPath, currentSong?.osuFiles]);

  // Calculate pagination
  const totalPages = Math.ceil(songs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSongs = useMemo(() => {
    return songs.slice(startIndex, endIndex);
  }, [songs, startIndex, endIndex]);

  const handlePageChange = (page) => {
    if (onPageChange) {
      onPageChange(page);
    } else {
      setInternalPage(page);
    }
    const scrollEl = scrollContainerRef.current || listRef.current;
    if (scrollEl) {
      scrollEl.scrollTop = 0;
    }
  };

  // Persist scroll position per viewKey (debounced)
  useEffect(() => {
    // Compute the scroll element at the start of the effect so we capture the right element for the lifetime
    const el = listRef.current?.closest?.('.main-content-body') || listRef.current;
    if (!el || !viewKey) return;

    let timer = null;
    let lastSaved = null;

    const handler = () => {
      try {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          try {
            lastSaved = el.scrollTop;
            sessionStorage.setItem(`sosu:scroll:${viewKey}`, String(lastSaved));
            if (typeof console !== 'undefined' && console.debug) console.debug('[SongList] saved scroll', { viewKey, scrollTop: lastSaved });
          } catch (e) {}
        }, 150);
      } catch (e) {}
    };

    // Attach listener; do NOT overwrite an existing saved scroll on mount to avoid clobber during restore
    el.addEventListener('scroll', handler, { passive: true });
    try {
      const key = `sosu:scroll:${viewKey}`;
      const existing = sessionStorage.getItem(key);
      if (existing == null) {
        // Only snapshot if nothing saved yet (avoids overwriting a restored value before it applies)
        lastSaved = el.scrollTop;
        sessionStorage.setItem(key, String(lastSaved));
        if (typeof console !== 'undefined' && console.debug) console.debug('[SongList] initial snapshot scroll (no existing)', { viewKey, scrollTop: lastSaved });
      } else {
        if (typeof console !== 'undefined' && console.debug) console.debug('[SongList] preserved existing saved scroll on mount', { viewKey, saved: existing });
      }
    } catch (e) {}

    // save on unmount or when viewKey changes - write only if we have a recent local snapshot
    return () => {
      el.removeEventListener('scroll', handler);
      if (timer) { clearTimeout(timer); }
      try {
        if (lastSaved != null) {
          sessionStorage.setItem(`sosu:scroll:${viewKey}`, String(lastSaved));
          if (typeof console !== 'undefined' && console.debug) console.debug('[SongList] cleanup saved scroll', { viewKey, scrollTop: lastSaved });
        } else {
          if (typeof console !== 'undefined' && console.debug) console.debug('[SongList] cleanup no local scroll changes to save', { viewKey });
        }
      } catch (e) {}
    };
  }, [viewKey, songs.length]);

  if (songs.length === 0) {
    return (
      <div className="song-list-empty">
        <p>No songs found matching your search</p>
      </div>
    );
  }

  return (
    <div className={`song-list ${isMostPlayed ? 'most-played' : ''}`}>
      <div className="song-list-header">
        <div className="song-list-header-item">#</div>
        <div className="song-list-header-item">Title</div>
        <div className="song-list-header-item">Artist</div>
        <div className="song-list-header-item">Duration</div>
      </div>
      <div className="song-list-items" ref={listRef}>
        {paginatedSongs.map((song, index) => (
          <React.Fragment key={song.id}>
            <SongItem
              song={song}
              pageIndex={index}
              index={startIndex + index + 1}
              isPlaying={isPlayingNow && currentSong?.id === song.id && !currentSong?._difficultyFilename}
              isSelected={currentSong?.id === song.id && !currentSong?._difficultyFilename}
              isHighlighted={highlightedSongId === song.id}
              onSelect={onSongSelect}
              onPreviewSelect={onPreviewSelect}
              onClearPreview={onClearPreview}
              duration={getSongDuration(song)}
              isPlaylist={isPlaylist}
              onRemoveFromPlaylist={onRemoveFromPlaylist}
              allSongs={allSongs}
              onAddToPlaylist={onAddToPlaylist}
              playlists={playlists}
              showSongBadges={showSongBadges}
              onCreatePlaylist={onCreatePlaylist}
              isFavorite={favorites[song.id] || false}
              onToggleFavorite={onToggleFavorite}
              onAddArtistToFilter={onAddArtistToFilter}
              onOpenSongDetails={onOpenSongDetails}
              onOpenBeatmapPreview={onOpenBeatmapPreview}
              playCount={playCounts?.[song.id] || 0}
              isMostPlayed={isMostPlayed}
            />
            {currentSong?.id === song.id && !currentSong?._difficultyFilename && Array.isArray(song.duplicates) && song.duplicates.length > 0 && (
              <div className="song-list-dedupe-dropdown">
                <div className="song-list-dedupe-dropdown-label">
                  Hidden duplicates ({song.duplicatesCount ?? song.duplicates.length})
                </div>
                {song.duplicates.map((dup, dupIndex) => (
                  <SongItem
                    key={dup.id}
                    song={dup}
                    pageIndex={dupIndex}
                    index={dupIndex + 1}
                    isPlaying={isPlayingNow && currentSong?.id === dup.id}
                    isSelected={currentSong?.id === dup.id}
                    isHighlighted={highlightedSongId === dup.id}
                    onSelect={onSongSelect}
                    onPreviewSelect={onPreviewSelect}
                    onClearPreview={onClearPreview}
                    duration={getSongDuration(dup)}
                    isPlaylist={false}
                    onRemoveFromPlaylist={null}
                    allSongs={allSongs}
                    onAddToPlaylist={onAddToPlaylist}
                    playlists={playlists}
                    showSongBadges={showSongBadges}
                    onCreatePlaylist={onCreatePlaylist}
                    isFavorite={favorites[dup.id] || false}
                    onToggleFavorite={onToggleFavorite}
                    onAddArtistToFilter={onAddArtistToFilter}
                    onOpenSongDetails={onOpenSongDetails}
                    onOpenBeatmapPreview={onOpenBeatmapPreview}
                    playCount={playCounts?.[dup.id] || 0}
                    isMostPlayed={false}
                    isDuplicate={true}
                    canonicalSong={currentSong}
                  />
                ))}
              </div>
            )}
            {/* Show difficulties dropdown if song has multiple .osu files */}
            {currentSong?.id === song.id && Array.isArray(songDifficulties[song.id]) && songDifficulties[song.id].length > 0 && (
              <div className="song-list-dedupe-dropdown">
                <div className="song-list-dedupe-dropdown-label">
                  Other difficulties ({songDifficulties[song.id].length})
                </div>
                {songDifficulties[song.id].map((diff, diffIndex) => (
                  <SongItem
                    key={diff._difficultyFilename || diff.id}
                    song={diff}
                    pageIndex={diffIndex}
                    index={diffIndex + 1}
                    isPlaying={isPlayingNow && currentSong?._difficultyFilename === diff._difficultyFilename && currentSong?.id === diff.id}
                    isSelected={currentSong?._difficultyFilename === diff._difficultyFilename && currentSong?.id === diff.id}
                    isHighlighted={highlightedSongId === diff.id}
                    onSelect={onSongSelect}
                    onPreviewSelect={onPreviewSelect}
                    onClearPreview={onClearPreview}
                    duration={getSongDuration(diff)}
                    isPlaylist={false}
                    onRemoveFromPlaylist={null}
                    allSongs={allSongs}
                    onAddToPlaylist={onAddToPlaylist}
                    playlists={playlists}
                    showSongBadges={false}
                    onCreatePlaylist={onCreatePlaylist}
                    isFavorite={favorites[diff.id] || false}
                    onToggleFavorite={onToggleFavorite}
                    onAddArtistToFilter={onAddArtistToFilter}
                    onOpenSongDetails={onOpenSongDetails}
                    onOpenBeatmapPreview={onOpenBeatmapPreview}
                    playCount={playCounts?.[diff.id] || 0}
                    isMostPlayed={false}
                    isDuplicate={true}
                    canonicalSong={currentSong}
                  />
                ))}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="song-list-pagination">
          <button
            className="pagination-button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <div className="pagination-pages">
            {currentPage > 3 && (
              <>
                <button className="pagination-page" onClick={() => handlePageChange(1)}>1</button>
                {currentPage > 4 && <span className="pagination-ellipsis">...</span>}
              </>
            )}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                // Show current page, and 2 pages before/after
                return page >= currentPage - 2 && page <= currentPage + 2;
              })
              .map(page => (
                <button
                  key={page}
                  className={`pagination-page ${page === currentPage ? 'active' : ''}`}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </button>
              ))}
            {currentPage < totalPages - 2 && (
              <>
                {currentPage < totalPages - 3 && <span className="pagination-ellipsis">...</span>}
                <button className="pagination-page" onClick={() => handlePageChange(totalPages)}>{totalPages}</button>
              </>
            )}
          </div>
          <button
            className="pagination-button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default SongList;
