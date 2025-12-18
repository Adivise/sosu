import React from 'react';
import { Music, ListMusic, Plus, Settings2Icon, FileMusicIcon } from 'lucide-react';
import { VERSION } from '../version';
import './Sidebar.css';

const Sidebar = ({ onSelectFolder, osuFolderPath, currentView, onViewChange, playlists, onCreatePlaylist, onSelectPlaylist, selectedPlaylistId }) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <Music className="sidebar-logo" size={32} />
        <div className="sidebar-title-container">
          <h1 className="sidebar-title">SOSU</h1>
          <span className="version-badge">v{VERSION}</span>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        <button 
          className={`nav-item ${currentView === 'songs' ? 'active' : ''}`}
          onClick={() => onViewChange('songs')}
        >
          <FileMusicIcon size={20} />
          <span>Library</span>
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

