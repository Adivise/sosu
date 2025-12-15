import React, { useState, useMemo } from 'react';
import SearchBar from './SearchBar';
import SongList from './SongList';
import './MainContent.css';

const MainContent = ({ 
  songs, 
  onSongSelect, 
  currentSong, 
  songDurations, 
  loading, 
  loadingProgress,
  currentView,
  selectedPlaylistId,
  playlists,
  allSongs,
  onRemoveFromPlaylist,
  onDeletePlaylist,
  minDurationValue = 0
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortBy, setSortBy] = useState('none'); // default is no sorting, other values: 'az', 'za', 'duration'

  // Debounce search query to prevent lag
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredSongs = useMemo(() => {
    // Songs are already filtered by duration and duplicates in getCurrentSongs()
    // Here we apply search filter and sorting
    let result = songs;

    // Duration display filter (custom user value)
    if (minDurationValue > 0) {
      result = result.filter(song => {
        const duration = songDurations[song.id] || song.duration || 0;
        return duration > minDurationValue;
      });
    }

    // Apply search filter
    if (debouncedQuery.trim()) {
      const query = debouncedQuery.toLowerCase();
      result = result.filter(song => 
        song.title.toLowerCase().includes(query) ||
        song.artist.toLowerCase().includes(query) ||
        song.folderName.toLowerCase().includes(query) ||
        (song.album && song.album.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    if (sortBy === 'az') {
      result = [...result].sort((a, b) => {
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        return titleA.localeCompare(titleB);
      });
    } else if (sortBy === 'za') {
      result = [...result].sort((a, b) => {
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        return titleB.localeCompare(titleA);
      });
    } else if (sortBy === 'duration') {
      result = [...result].sort((a, b) => {
        const durationA = songDurations[a.id] || a.duration || 0;
        const durationB = songDurations[b.id] || b.duration || 0;
        return durationA - durationB; // Sort by duration ascending (shortest first)
      });
    }

    return result;
  }, [songs, debouncedQuery, sortBy, songDurations, minDurationValue]);

  if (loading) {
    const progressText = loadingProgress.total > 0 
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

  const selectedPlaylist = selectedPlaylistId ? playlists.find(p => p.id === selectedPlaylistId) : null;
  const isPlaylistView = currentView.startsWith('playlist-') || selectedPlaylistId !== null;

  return (
    <div className="main-content">
      <div className="main-content-header">
        {isPlaylistView && selectedPlaylist ? (
          <div className="playlist-header">
            <div className="playlist-header-info">
              <h2 className="playlist-title">{selectedPlaylist.name}</h2>
              <span className="playlist-subtitle">{selectedPlaylist.songs.length} songs</span>
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
            <h2 className="view-title">Songs</h2>
            <span className="view-subtitle">{songs.length} songs</span>
          </div>
        ) : null}
        <SearchBar 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          songs={songs}
          showFilters={true}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
      </div>
      
      <div className="main-content-body">
        {currentView === 'songs' && songs.length === 0 ? (
          <div className="empty-state">
            <h2>No songs loaded</h2>
            <p>Select your osu! songs folder to get started</p>
          </div>
        ) : isPlaylistView && songs.length === 0 ? (
          <div className="empty-state">
            <h2>Playlist is empty</h2>
            <p>Add songs to this playlist from the Songs view</p>
          </div>
        ) : songs.length > 0 ? (
          <SongList 
            songs={filteredSongs}
            onSongSelect={onSongSelect}
            currentSong={currentSong}
            songDurations={songDurations}
            isPlaylist={isPlaylistView}
            onRemoveFromPlaylist={selectedPlaylistId ? (songId) => onRemoveFromPlaylist(selectedPlaylistId, songId) : null}
            allSongs={allSongs}
            playlists={playlists}
          />
        ) : null}
      </div>
    </div>
  );
};

export default MainContent;