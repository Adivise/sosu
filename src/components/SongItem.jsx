import React, { useState, useRef } from 'react';
import { Play, Pause, Music, Plus, X } from 'lucide-react';
import PlaylistMenu from './PlaylistMenu';
import './SongItem.css';

const SongItem = ({ song, index, isPlaying, isSelected, onSelect, duration, isPlaylist, onRemoveFromPlaylist, allSongs, onAddToPlaylist, playlists }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const addButtonRef = useRef(null);
  const menuContainerRef = useRef(null);

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClick = () => {
    onSelect(song);
  };

  const handleAddToPlaylist = (e) => {
    e.stopPropagation();
    if (playlists.length === 0) {
      alert('Please create a playlist first from "Your Playlists"');
      return;
    }
    setShowPlaylistMenu(true);
    
    // Position menu to stay within viewport
    setTimeout(() => {
      if (menuContainerRef.current && addButtonRef.current) {
        const menuRect = menuContainerRef.current.getBoundingClientRect();
        const buttonRect = addButtonRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        // If menu would go above viewport, show it below instead
        if (buttonRect.top - menuRect.height < 0) {
          menuContainerRef.current.style.bottom = 'auto';
          menuContainerRef.current.style.top = '100%';
          menuContainerRef.current.style.marginTop = '8px';
          menuContainerRef.current.style.marginBottom = '0';
        } else {
          menuContainerRef.current.style.top = 'auto';
          menuContainerRef.current.style.bottom = '100%';
          menuContainerRef.current.style.marginBottom = '8px';
          menuContainerRef.current.style.marginTop = '0';
        }
        
        // Ensure menu doesn't go off right edge
        const menuRight = buttonRect.right;
        const viewportWidth = window.innerWidth;
        if (menuRight > viewportWidth - 20) {
          menuContainerRef.current.style.right = '0';
          menuContainerRef.current.style.left = 'auto';
        }
      }
    }, 0);
  };

  const handleAddToPlaylistSelect = (playlistId) => {
    onAddToPlaylist(playlistId, song);
  };

  return (
    <div
      className={`song-item ${isPlaying ? 'playing' : ''} ${isSelected ? 'selected' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <div className="song-item-number">
        {isPlaying ? (
          <Pause size={16} />
        ) : isHovered ? (
          <Play size={16} fill="currentColor" />
        ) : (
          <span>{index.toString().padStart(2, '0')}</span>
        )}
      </div>
      <div className="song-item-title">
        <div className="song-item-image">
          {song.imageFile ? (
            <>
              <img 
                src={`osu://${encodeURIComponent(song.imageFile)}`} 
                alt={song.title}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="song-item-image-placeholder" style={{ display: 'none' }}>
                <Music size={24} />
              </div>
            </>
          ) : (
            <div className="song-item-image-placeholder">
              <Music size={24} />
            </div>
          )}
        </div>
        <div className="song-item-info">
          <div className="song-item-name" title={song.title}>{song.title}</div>
        </div>
      </div>
      <div className="song-item-artist">{song.artist}</div>
      <div className="song-item-duration" style={{ position: 'relative' }}>
        {isPlaylist && onRemoveFromPlaylist ? (
          <>
            <span className="song-item-duration-text">{formatDuration(duration || song.duration)}</span>
            <button 
              className="remove-from-playlist-button"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFromPlaylist(song.id);
              }}
              title="Remove from playlist"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <span className="song-item-duration-text">{formatDuration(duration || song.duration)}</span>
            {onAddToPlaylist && (
              <>
                <button 
                  ref={addButtonRef}
                  className="add-to-playlist-button"
                  onClick={handleAddToPlaylist}
                  title="Add to playlist"
                >
                  <Plus size={14} />
                </button>
                {showPlaylistMenu && (
                  <div 
                    ref={menuContainerRef}
                    style={{ 
                      position: 'absolute', 
                      right: 0, 
                      bottom: '100%', 
                      marginBottom: '8px',
                      zIndex: 1000
                    }}
                  >
                    <PlaylistMenu
                      playlists={playlists}
                      onAddToPlaylist={handleAddToPlaylistSelect}
                      onClose={() => setShowPlaylistMenu(false)}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SongItem;

