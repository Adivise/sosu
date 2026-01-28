import React, { useState, useMemo, useRef } from 'react';
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
  minDurationValue = 0,
  albumArtBlur = false,
  blurIntensity = 60,
  favorites = {},
  onToggleFavorite,
  ratings = {},
  onSetRating,
  isPlayingNow = false,
  itemsPerPage = 50,
  onDisplayedSongsChange
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

  // Persist sort settings
  React.useEffect(() => {
    localStorage.setItem('sortBy', sortBy);
  }, [sortBy]);

  React.useEffect(() => {
    localStorage.setItem('sortDuration', sortDuration);
  }, [sortDuration]);

  // Debounce search query
  React.useEffect(() => {
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
        (song.album && song.album.toLowerCase().includes(query))
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

    return result;
  }, [songs, debouncedQuery, sortBy, sortDuration, songDurations, minDurationValue, durationFilter, currentView]);

  // Notify parent component when displayed songs change (with comparison to avoid unnecessary updates)
  const prevFilteredSongsRef = useRef([]);
  React.useEffect(() => {
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

  const selectedPlaylist = selectedPlaylistId
    ? playlists.find(p => p.id === selectedPlaylistId)
    : null;
  const isPlaylistView =
    currentView.startsWith('playlist-') || selectedPlaylistId !== null;

  return (
    <div className="main-content">
      <div className="main-content-header">
        {isPlaylistView && selectedPlaylist ? (
          <div className="playlist-header">
            <div className="playlist-header-info">
              <h2 className="playlist-title">{selectedPlaylist.name}</h2>
              <span className="playlist-subtitle">
                {selectedPlaylist.songs.length} songs
              </span>
            </div>
            <button
              className="delete-playlist-button"
              onClick={() => onDeletePlaylist(selectedPlaylistId)}
              title="Delete Playlist"
            >
              Delete Playlist
            </button>
          </div>
        ) : currentView === 'songs' ? (
          <div className="view-header">
            <h2 className="view-title">Library</h2>
            <span className="view-subtitle">{songs.length} songs</span>
          </div>
        ) : currentView === 'recently-played' ? (
          <div className="view-header">
            <h2 className="view-title">Recently Played</h2>
            <span className="view-subtitle">{filteredSongs.length} songs</span>
          </div>
        ) : currentView === 'favorites' ? (
          <div className="view-header">
            <h2 className="view-title">Favorites</h2>
            <span className="view-subtitle">{filteredSongs.length} songs</span>
          </div>
        ) : currentView === 'most-played' ? (
          <div className="view-header">
            <h2 className="view-title">Most Played</h2>
            <span className="view-subtitle">{filteredSongs.length} songs</span>
          </div>
        ) : null}
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          songs={songs}
          showFilters={currentView !== 'recently-played' && currentView !== 'most-played'}
          sortBy={sortBy}
          onSortChange={setSortBy}
          sortDuration={sortDuration}
          onSortDurationChange={setSortDuration}
          durationFilter={durationFilter}
          onDurationFilterChange={setDurationFilter}
          showAdvancedFilters={showAdvancedFilters}
          onToggleAdvancedFilters={() => setShowAdvancedFilters(!showAdvancedFilters)}
        />
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
            <p>This playlist doesn't contain any songs yet</p>
          </div>
        ) : songs.length > 0 ? (
          <SongList
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
            ratings={ratings}
            onSetRating={onSetRating}
            isPlayingNow={isPlayingNow}
            itemsPerPage={itemsPerPage}
            currentPage={currentPageForView}
            onPageChange={(page) => {
              setPageByView(prev => ({
                ...prev,
                [viewKey]: page
              }));
            }}
          />
        ) : null}
      </div>
    </div>
  );
};

export default MainContent;