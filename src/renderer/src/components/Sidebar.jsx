import { Music, ListMusic, Plus, Settings2Icon, FileMusicIcon, Clock, Heart, TrendingUp } from 'lucide-react';
import { VERSION } from '../version';
import './Sidebar.css';

const Sidebar = ({ onSelectFolder, currentView, onViewChange, playlists, onCreatePlaylist, onSelectPlaylist, selectedPlaylistId, onOpenSettings }) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <Music className="sidebar-logo" size={32} />
        <div className="sidebar-title-container">
          <h1 className="sidebar-title">SOSU</h1>
          <span className="version-badge">v{VERSION}</span>
        </div>
      </div>
      
      <div className="sidebar-scroll">
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${currentView === 'songs' ? 'active' : ''}`}
            onClick={() => onViewChange('songs')}
          >
            <FileMusicIcon size={20} />
            <span>Library</span>
          </button>
          <button 
            className={`nav-item ${currentView === 'favorites' ? 'active' : ''}`}
            onClick={() => onViewChange('favorites')}
          >
            <Heart size={20} />
            <span>Favorites</span>
          </button>
          <button 
            className={`nav-item ${currentView === 'most-played' ? 'active' : ''}`}
            onClick={() => onViewChange('most-played')}
          >
            <TrendingUp size={20} />
            <span>Most Played</span>
          </button>
          <button 
            className={`nav-item ${currentView === 'recently-played' ? 'active' : ''}`}
            onClick={() => onViewChange('recently-played')}
          >
            <Clock size={20} />
            <span>Recently Played</span>
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
      </div>

      <div className="sidebar-section">
        <button className="folder-button" onClick={onOpenSettings || onSelectFolder}>
          <Settings2Icon size={18} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

