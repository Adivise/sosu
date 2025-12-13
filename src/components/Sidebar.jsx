import React from 'react';
import { Music, FolderOpen, ListMusic, Plus, Settings2Icon } from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ onSelectFolder, osuFolderPath, currentView, onViewChange, playlists, onCreatePlaylist, onSelectPlaylist, selectedPlaylistId }) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <Music className="sidebar-logo" size={32} />
        <h1 className="sidebar-title">sosu</h1>
      </div>
      
      <nav className="sidebar-nav">
        <button 
          className={`nav-item ${currentView === 'songs' ? 'active' : ''}`}
          onClick={() => onViewChange('songs')}
        >
          <Music size={20} />
          <span>Songs</span>
        </button>
      </nav>

      <div className="playlists-section">
        <div className="playlists-category-header">
          <ListMusic size={16} />
          <span>Your Playlists</span>
        </div>
        <button className="create-playlist-button" onClick={onCreatePlaylist}>
          <Plus size={18} />
          <span>Create Playlist</span>
        </button>
        <div className="playlists-list">
          {playlists.map(playlist => (
            <button
              key={playlist.id}
              className={`playlist-item ${selectedPlaylistId === playlist.id ? 'active' : ''}`}
              onClick={() => onSelectPlaylist(playlist.id)}
              title={playlist.name}
            >
              <ListMusic size={16} />
              <span className="playlist-name">{playlist.name}</span>
              <span className="playlist-count">({playlist.songs.length})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-section">
        <button className="folder-button" onClick={onSelectFolder}>
          <Settings2Icon size={18} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

