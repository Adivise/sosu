import React, { useState, useMemo, useRef, useEffect } from 'react';
import SearchBar from './SearchBar';
import SongList from './SongList';
import './MainContent.css';

const MainContent = ({ 
  songs, 
  onSongSelect, 
  currentSong, 
  songDurations = {},   // ✅ default to empty object
  loading, 
  loadingProgress,
  currentView,
  selectedPlaylistId,
  playlists,
  allSongs,
  onRemoveFromPlaylist,
  onDeletePlaylist,
  onRenamePlaylist,
  minDurationValue = 0,
  favorites = {},
  onToggleFavorite,
  isPlayingNow = false,
  itemsPerPage = 50,
  onDisplayedSongsChange,
  onAddArtistToFilter = null, // handler from App to add artist to hidden list
  onOpenSongDetails = null,
  onOpenBeatmapPreview = null,
  onPreviewSelect = null,
  onClearPreview = null,
  onCreatePlaylist = null,
  highlightedSongId = null,
  playCounts = {},
  nameFilter = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortBy, setSortBy] = useState(() => {
    const saved = localStorage.getItem('sortBy');
    return saved || 'none';
  });
  const [sortDuration, setSortDuration] = useState(() => {
    const saved = localStorage.getItem('sortDuration');
    return saved || 'none';
  });
  const [durationFilter, setDurationFilter] = useState({ min: 0, max: Infinity });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [pageByView, setPageByView] = useState({});
  const [isRenamingPlaylist, setIsRenamingPlaylist] = useState(false);
  const [renamePlaylistValue, setRenamePlaylistValue] = useState('');
  const renameInputRef = useRef(null);
  const [modeSortIndex, setModeSortIndex] = useState(0);

  // Restore saved per-view pages from sessionStorage on mount
  useEffect(() => {
    try {
      const pages = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('sosu:page:')) {
          const view = key.slice('sosu:page:'.length);
          const val = Math.max(1, parseInt(sessionStorage.getItem(key), 10) || 1);
          pages[view] = val;
        }
      }
      if (Object.keys(pages).length > 0) {
        if (typeof console !== 'undefined' && console.debug) console.debug('[MainContent] restoring saved pages', pages);
        // Merge saved pages so they win over any existing defaults
        setPageByView(prev => ({ ...prev, ...pages }));
      }
    } catch (e) {}
  }, []);

  // Skip resetting pages on initial mount (we restore saved pages first)
  const _skipPageResetOnMountRef = React.useRef(false);
  const listRef = React.useRef(null);

  // Persist sort settings
  useEffect(() => {
    localStorage.setItem('sortBy', sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem('sortDuration', sortDuration);
  }, [sortDuration]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Determine a stable key for pagination per view (songs, favorites, most-played, playlist-<id>, etc.)
  const viewKey = React.useMemo(() => {
    if (currentView.startsWith('playlist-') || selectedPlaylistId !== null) {
      return `playlist-${selectedPlaylistId ?? 'none'}`;
    }
    return currentView || 'songs';
  }, [currentView, selectedPlaylistId]);

  const currentPageForView = pageByView[viewKey] || 1;

  // Track previous dependency values so we can tell what changed (view vs filters)
  const prevDepsRef = React.useRef({ viewKey, debouncedQuery, minDurationValue, durationMin: durationFilter.min, durationMax: durationFilter.max, sortBy, sortDuration, nameFilter });

  // If user changes search query or filters, reset the current page for this view to 1
  useEffect(() => {
    // Avoid resetting to page 1 during initial mount when we've restored saved pages
    if (!_skipPageResetOnMountRef.current) {
      _skipPageResetOnMountRef.current = true;
      if (typeof console !== 'undefined' && console.debug) console.debug('[MainContent] skipped initial page reset', { viewKey });
      // Initialize prevDeps to current values
      prevDepsRef.current = { viewKey, debouncedQuery, minDurationValue, durationMin: durationFilter.min, durationMax: durationFilter.max, sortBy, sortDuration, nameFilter };
      return;
    }

    // Determine what changed: view only vs filters
    const prev = prevDepsRef.current || {};
    const viewChanged = prev.viewKey !== viewKey;
    const filtersChanged = prev.debouncedQuery !== debouncedQuery || prev.minDurationValue !== minDurationValue || prev.durationMin !== durationFilter.min || prev.durationMax !== durationFilter.max || prev.sortBy !== sortBy || prev.sortDuration !== sortDuration || prev.nameFilter !== nameFilter;

    if (viewChanged && !filtersChanged) {
      // Attempt to restore saved page for this view if present
      try {
        const saved = sessionStorage.getItem(`sosu:page:${viewKey}`);
        if (saved != null) {
          const v = Math.max(1, parseInt(saved, 10) || 1);
          setPageByView(prev => ({ ...prev, [viewKey]: v }));
          if (typeof console !== 'undefined' && console.debug) console.debug('[MainContent] restored page for view change', { viewKey, restoredPage: v });
          // update prev and return
          prevDepsRef.current = { viewKey, debouncedQuery, minDurationValue, durationMin: durationFilter.min, durationMax: durationFilter.max, sortBy, sortDuration, nameFilter };
          return;
        }
      } catch (e) {}

      // No saved value -> reset to 1
      setPageByView(prev => ({ ...prev, [viewKey]: 1 }));
      try { sessionStorage.setItem(`sosu:page:${viewKey}`, '1'); } catch (e) {}
      if (typeof console !== 'undefined' && console.debug) console.debug('[MainContent] reset page to 1 (no saved) on view change', { viewKey });
    } else {
      // Filters changed (or both changed) -> reset to 1
      setPageByView(prev => ({ ...prev, [viewKey]: 1 }));
      try { sessionStorage.setItem(`sosu:page:${viewKey}`, '1'); } catch (e) {}
      if (typeof console !== 'undefined' && console.debug) console.debug('[MainContent] resetting page to 1 due to filter/view change', { viewKey });
    }

    // Update previous dependency snapshot
    prevDepsRef.current = { viewKey, debouncedQuery, minDurationValue, durationMin: durationFilter.min, durationMax: durationFilter.max, sortBy, sortDuration, nameFilter };
  }, [viewKey, debouncedQuery, minDurationValue, durationFilter.min, durationFilter.max, sortBy, sortDuration, nameFilter, modeSortIndex]);

  const filteredSongs = useMemo(() => {
    let result = songs || [];

    // ✅ Filter by user-set minimum duration
    if (minDurationValue > 0) {
      result = result.filter(song => {
        const duration = songDurations?.[song.id] ?? song.duration ?? 0;
        return duration > minDurationValue;
      });
    }

    // ✅ Apply duration range filter
    if (durationFilter.min > 0 || durationFilter.max < Infinity) {
      result = result.filter(song => {
        const duration = songDurations?.[song.id] ?? song.duration ?? 0;
        return duration >= durationFilter.min && duration <= durationFilter.max;
      });
    }

    // ✅ Apply search filter
    if (debouncedQuery.trim()) {
      const query = debouncedQuery.toLowerCase();
      result = result.filter(song => 
        (song.title || '').toLowerCase().includes(query) ||
        (song.artist || '').toLowerCase().includes(query) ||
        (song.folderName || '').toLowerCase().includes(query) ||
        (song.album && song.album.toLowerCase().includes(query)) ||
        (song.version || '').toLowerCase().includes(query)
      );
    }

    const allowSort = currentView !== 'recently-played' && currentView !== 'most-played';

    // ✅ Sorting by name (disabled on Recently/Most Played)
    if (allowSort && sortBy === 'az') {
      result = [...result].sort((a, b) =>
        (a.title || '').toLowerCase().localeCompare((b.title || '').toLowerCase())
      );
    } else if (allowSort && sortBy === 'za') {
      result = [...result].sort((a, b) =>
        (b.title || '').toLowerCase().localeCompare((a.title || '').toLowerCase())
      );
    }

    // ✅ Sorting by artist (new)
    if (allowSort && sortBy === 'artist-az') {
      result = [...result].sort((a, b) =>
        (a.artist || '').toLowerCase().localeCompare((b.artist || '').toLowerCase())
      );
    } else if (allowSort && sortBy === 'artist-za') {
      result = [...result].sort((a, b) =>
        (b.artist || '').toLowerCase().localeCompare((a.artist || '').toLowerCase())
      );
    }

    // ✅ Sorting by duration (disabled on Recently/Most Played)
    if (allowSort && sortDuration === 'asc') {
      result = [...result].sort((a, b) => {
        const durationA = songDurations?.[a.id] ?? a.duration ?? 0;
        const durationB = songDurations?.[b.id] ?? b.duration ?? 0;
        return durationA - durationB;
      });
    } else if (allowSort && sortDuration === 'desc') {
      result = [...result].sort((a, b) => {
        const durationA = songDurations?.[a.id] ?? a.duration ?? 0;
        const durationB = songDurations?.[b.id] ?? b.duration ?? 0;
        return durationB - durationA;
      });
    }

    // ✅ Sorting by mode (custom order)
    if (allowSort && sortBy === 'mode') {
      const MODE_ORDERS = [
        [0, 1, 2, 3],
        [1, 2, 3, 0],
        [2, 3, 0, 1],
        [3, 0, 1, 2],
      ];
      const order = MODE_ORDERS[modeSortIndex || 0];
      result = [...result].sort((a, b) => {
        const aMode = typeof a.mode === 'number' ? a.mode : 0;
        const bMode = typeof b.mode === 'number' ? b.mode : 0;
        return order.indexOf(aMode) - order.indexOf(bMode);
      });
    }

    return result;
  }, [songs, debouncedQuery, sortBy, sortDuration, songDurations, minDurationValue, durationFilter, currentView, modeSortIndex]);

  // Notify parent component when displayed songs change (with comparison to avoid unnecessary updates)
  const prevFilteredSongsRef = useRef([]);
  useEffect(() => {
    if (onDisplayedSongsChange) {
      // Check if songs actually changed (compare IDs)
      const prevIds = prevFilteredSongsRef.current.map(s => s.id).join(',');
      const currentIds = filteredSongs.map(s => s.id).join(',');
      
      if (prevIds !== currentIds) {
        onDisplayedSongsChange(filteredSongs);
        prevFilteredSongsRef.current = filteredSongs;
      }
    }
  }, [filteredSongs, onDisplayedSongsChange]);

  // Helpful message when there are no results (give quick actions)
  const noResultsMessage = (query) => {
    if (!query) return 'No songs found. Try changing filters or your search.';
    return `No results for "${query}". Try clearing the search or checking Filters (Settings).`;
  };

  const selectedPlaylist = selectedPlaylistId
    ? playlists.find(p => p.id === selectedPlaylistId)
    : null;
  const isPlaylistView =
    currentView.startsWith('playlist-') || selectedPlaylistId !== null;

  const handleStartRename = () => {
    if (selectedPlaylist) {
      setRenamePlaylistValue(selectedPlaylist.name);
      setIsRenamingPlaylist(true);
    }
  };

  const handleCancelRename = () => {
    setIsRenamingPlaylist(false);
    setRenamePlaylistValue('');
  };

  const handleConfirmRename = () => {
    if (onRenamePlaylist && selectedPlaylistId && renamePlaylistValue.trim()) {
      onRenamePlaylist(selectedPlaylistId, renamePlaylistValue.trim());
      setIsRenamingPlaylist(false);
      setRenamePlaylistValue('');
    }
  };

  useEffect(() => {
    if (isRenamingPlaylist && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenamingPlaylist]);

  // ✅ Loading state
  if (loading) {
    const progressText =
      loadingProgress.total > 0
        ? `Loading metadata... ${loadingProgress.current} / ${loadingProgress.total} songs`
        : 'Loading songs and metadata...';
    return (
      <div className="main-content">
        <div className="loading-state">
          <span className="spinner" /> {progressText}
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="main-content-header">
        {isPlaylistView && selectedPlaylist ? (
          <div className="playlist-header">
            <div className="playlist-header-info">
              {isRenamingPlaylist ? (
                <input
                  ref={renameInputRef}
                  type="text"
                  className="playlist-rename-input"
                  value={renamePlaylistValue}
                  onChange={(e) => setRenamePlaylistValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleConfirmRename();
                    } else if (e.key === 'Escape') {
                      handleCancelRename();
                    }
                  }}
                  onBlur={handleConfirmRename}
                />
              ) : (
                <h2 className="playlist-title">{selectedPlaylist.name}</h2>
              )}
              <span className="playlist-subtitle">
                {selectedPlaylist.songs.length} songs
              </span>
            </div>
            <div className="playlist-header-actions">
              {!isRenamingPlaylist && (
                <button
                  className="rename-playlist-button"
                  onClick={handleStartRename}
                  title="Rename Playlist"
                >
                  Rename
                </button>
              )}
              <button
                className="delete-playlist-button"
                onClick={() => onDeletePlaylist(selectedPlaylistId)}
                title="Delete Playlist"
              >
                Delete Playlist
              </button>
            </div>
          </div>
        ) : null}
        <div className="main-header-row">
          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            songs={songs}
            showFilters={currentView !== 'recently-played' && currentView !== 'most-played'}
            sortBy={sortBy}
            onSortChange={setSortBy}
            sortDuration={sortDuration}
            onSortDurationChange={setSortDuration}
            modeSortIndex={modeSortIndex}
            setModeSortIndex={setModeSortIndex}
            durationFilter={durationFilter}
            onDurationFilterChange={setDurationFilter}
            showAdvancedFilters={showAdvancedFilters}
            onToggleAdvancedFilters={() => setShowAdvancedFilters(!showAdvancedFilters)}
          />
          {currentView === 'songs' && (
            <div className="view-header-compact">
              <span className="view-title-compact">Library</span>
              <span className="view-subtitle-compact">{songs.length} songs</span>
            </div>
          )}
          {(currentView === 'favorites' || currentView === 'most-played' || currentView === 'recently-played') && (
            <div className="view-header-compact">
              <span className="view-title-compact">
                {currentView === 'favorites' ? 'Favorites' : currentView === 'most-played' ? 'Most Played' : 'Recently Played'}
              </span>
              <span className="view-subtitle-compact">{filteredSongs.length} songs</span>
            </div>
          )}
        </div>
      </div>

      <div className="main-content-body">
        {currentView === 'songs' && songs.length === 0 ? (
          <div className="empty-state">
            <h2>No songs loaded</h2>
            <p>Select your osu! songs folder to get started</p>
          </div>
        ) : currentView === 'favorites' && filteredSongs.length === 0 ? (
          <div className="empty-state">
            <h2>No favorite songs</h2>
            <p>Add songs to your favorites to see them here</p>
          </div>
        ) : currentView === 'most-played' && filteredSongs.length === 0 ? (
          <div className="empty-state">
            <h2>No played songs</h2>
            <p>Start playing songs to see them in this list</p>
          </div>
        ) : currentView === 'recently-played' && filteredSongs.length === 0 ? (
          <div className="empty-state">
            <h2>No recently played songs</h2>
            <p>Play some songs to see them here</p>
          </div>
        ) : isPlaylistView && songs.length === 0 ? (
          <div className="empty-state">
            <h2>Playlist is empty</h2>
            <p>Add songs to this playlist from the Songs view</p>
          </div>
        ) : isPlaylistView && filteredSongs.length === 0 ? (
          <div className="empty-state">
            <h2>No songs in this playlist</h2>
            <p>This playlist doesn&apos;t contain any songs yet</p>
          </div>
        ) : songs.length > 0 ? (
          // When there are songs available but filters/search hide all results, show a helpful message with quick actions
          filteredSongs.length === 0 ? (
            <div className="empty-state no-results-state">
              <h2>{noResultsMessage(debouncedQuery)}</h2>
              <p style={{ opacity: 0.85, marginTop: 8 }}>
                Suggestions: clear the search, check Filters (hidden artists / title filters / minimum duration), or switch view.
              </p>

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                  className="settings-button"
                  onClick={() => { setSearchQuery(''); setDebouncedQuery(''); if (listRef.current) listRef.current.scrollTop = 0; }}
                >
                  Clear Search
                </button>
                <button
                  className="settings-button primary"
                  onClick={() => window.dispatchEvent(new CustomEvent('sosu:open-settings'))}
                >
                  Open Filters (Settings)
                </button>
              </div>
            </div>
          ) : (

          <SongList
            listRef={listRef}
            songs={filteredSongs}
            onSongSelect={onSongSelect}
            currentSong={currentSong}
            songDurations={songDurations}
            isPlaylist={isPlaylistView}
            onRemoveFromPlaylist={
              selectedPlaylistId
                ? songId => onRemoveFromPlaylist(selectedPlaylistId, songId)
                : null
            }
            allSongs={allSongs}
            playlists={playlists}
            favorites={favorites}
            onToggleFavorite={onToggleFavorite}
            isPlayingNow={isPlayingNow}
            itemsPerPage={itemsPerPage}
            currentPage={currentPageForView}
            onPageChange={(page) => {
              setPageByView(prev => ({
                ...prev,
                [viewKey]: page
              }));
              try { sessionStorage.setItem(`sosu:page:${viewKey}`, String(page)); if (typeof console !== 'undefined' && console.debug) console.debug('[MainContent] saved page change', { viewKey, page }); } catch (e) {}
            }}
            onAddArtistToFilter={onAddArtistToFilter}
            onOpenSongDetails={onOpenSongDetails}
            onOpenBeatmapPreview={onOpenBeatmapPreview}
            onPreviewSelect={onPreviewSelect}
            onClearPreview={onClearPreview}
            onCreatePlaylist={onCreatePlaylist}
            highlightedSongId={highlightedSongId}
            playCounts={playCounts}
            isMostPlayed={currentView === 'most-played'}
            viewKey={viewKey}
          />
        )) : null}
      </div>
    </div>
  );
};

export default MainContent;