import React, { useState, useRef, useEffect } from 'react';
import { ListMusic, Plus } from 'lucide-react';
import './PlaylistMenu.css';

const PlaylistMenu = ({ playlists, onAddToPlaylist, onClose }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div ref={menuRef} className="playlist-menu">
      <div className="playlist-menu-header">Add to Playlist</div>
      <div className="playlist-menu-list">
        {playlists.length === 0 ? (
          <div className="playlist-menu-empty">No playlists yet</div>
        ) : (
          playlists.map(playlist => (
            <button
              key={playlist.id}
              className="playlist-menu-item"
              onClick={() => {
                onAddToPlaylist(playlist.id);
                onClose();
              }}
            >
              <ListMusic size={16} />
              <span>{playlist.name}</span>
              <span className="playlist-menu-count">({playlist.songs.length})</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default PlaylistMenu;

