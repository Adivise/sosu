import React, { useState, useEffect, useRef, useMemo } from 'react';
import SongItem from './SongItem';
import './SongList.css';

const SongList = ({ songs, onSongSelect, currentSong, songDurations, isPlaylist, onRemoveFromPlaylist, allSongs, onAddToPlaylist, playlists, favorites = {}, onToggleFavorite, isPlayingNow = false, itemsPerPage = 50, currentPage: controlledPage, onPageChange }) => {
  const [internalPage, setInternalPage] = useState(1);
  const listRef = useRef(null);
  const isControlled = typeof controlledPage === 'number' && controlledPage > 0;
  const currentPage = isControlled ? controlledPage : internalPage;

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

  // Reset to page 1 when songs change (only for uncontrolled pagination)
  useEffect(() => {
    if (isControlled) return;
    setInternalPage(1);
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [songs.length, isControlled]);

  // Calculate pagination
  const totalPages = Math.ceil(songs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSongs = useMemo(() => {
    return songs.slice(startIndex, endIndex);
  }, [songs, startIndex, endIndex, itemsPerPage]);

  const handlePageChange = (page) => {
    if (onPageChange) {
      onPageChange(page);
    } else {
      setInternalPage(page);
    }
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  };

  if (songs.length === 0) {
    return (
      <div className="song-list-empty">
        <p>No songs found matching your search</p>
      </div>
    );
  }

  return (
    <div className="song-list">
      <div className="song-list-header">
        <div className="song-list-header-item">#</div>
        <div className="song-list-header-item">Title</div>
        <div className="song-list-header-item">Artist</div>
        <div className="song-list-header-item">Duration</div>
      </div>
      <div className="song-list-items" ref={listRef}>
        {paginatedSongs.map((song, index) => (
          <SongItem
            key={song.id}
            song={song}
            index={startIndex + index + 1}
            isPlaying={isPlayingNow && currentSong?.id === song.id}
            isSelected={currentSong?.id === song.id}
            onSelect={onSongSelect}
            duration={getSongDuration(song)}
            isPlaylist={isPlaylist}
            onRemoveFromPlaylist={onRemoveFromPlaylist}
            allSongs={allSongs}
            onAddToPlaylist={onAddToPlaylist}
            playlists={playlists}
            isFavorite={favorites[song.id] || false}
            onToggleFavorite={onToggleFavorite}
          />
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
