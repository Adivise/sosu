import React, { useState, useEffect, useRef, useMemo } from 'react';
import SongItem from './SongItem';
import './SongList.css';

const ITEMS_PER_PAGE = 50;

const SongList = ({ songs, onSongSelect, currentSong, songDurations, isPlaylist, onRemoveFromPlaylist, allSongs, onAddToPlaylist, playlists }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const listRef = useRef(null);

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

  // Reset to page 1 when songs change
  useEffect(() => {
    setCurrentPage(1);
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [songs.length]);

  // Calculate pagination
  const totalPages = Math.ceil(songs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedSongs = useMemo(() => {
    return songs.slice(startIndex, endIndex);
  }, [songs, startIndex, endIndex]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
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
            isPlaying={currentSong?.id === song.id}
            isSelected={currentSong?.id === song.id}
            onSelect={onSongSelect}
            duration={getSongDuration(song)}
            isPlaylist={isPlaylist}
            onRemoveFromPlaylist={onRemoveFromPlaylist}
            allSongs={allSongs}
            onAddToPlaylist={onAddToPlaylist}
            playlists={playlists}
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
          <span className="pagination-info">
            Page {currentPage} of {totalPages} ({songs.length} songs)
          </span>
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
