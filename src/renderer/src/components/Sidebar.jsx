import { useState } from 'react';
import { Music, ListMusic, Plus, Settings2Icon, FileMusicIcon, Clock, Heart, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { VERSION } from '../version';
import './Sidebar.css';

const Sidebar = ({ onSelectFolder, currentView, onViewChange, playlists, onCreatePlaylist, onSelectPlaylist, selectedPlaylistId, onOpenSettings }) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
  };

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!isCollapsed && (
          <>
            <Music className="sidebar-logo" size={32} />
            <div className="sidebar-title-container">
              <h1 className="sidebar-title">SOSU</h1>
              <span className="version-badge">v{VERSION}</span>
            </div>
          </>
        )}
        <button className="sidebar-toggle" onClick={toggleCollapse} title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
      
      <div className="sidebar-scroll">
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${currentView === 'songs' ? 'active' : ''}`}
            onClick={() => onViewChange('songs')}
            title={isCollapsed ? 'Library' : ''}
          >
            <FileMusicIcon size={20} />
            {!isCollapsed && <span>Library</span>}
          </button>
          <button 
            className={`nav-item ${currentView === 'favorites' ? 'active' : ''}`}
            onClick={() => onViewChange('favorites')}
            title={isCollapsed ? 'Favorites' : ''}
          >
            <Heart size={20} />
            {!isCollapsed && <span>Favorites</span>}
          </button>
          <button 
            className={`nav-item ${currentView === 'most-played' ? 'active' : ''}`}
            onClick={() => onViewChange('most-played')}
            title={isCollapsed ? 'Most Played' : ''}
          >
            <TrendingUp size={20} />
            {!isCollapsed && <span>Most Played</span>}
          </button>
          <button 
            className={`nav-item ${currentView === 'recently-played' ? 'active' : ''}`}
            onClick={() => onViewChange('recently-played')}
            title={isCollapsed ? 'Recently Played' : ''}
          >
            <Clock size={20} />
            {!isCollapsed && <span>Recently Played</span>}
          </button>
        </nav>

        {!isCollapsed && (
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
        )}
      </div>

      <div className="sidebar-section">
        <button className="folder-button" onClick={onOpenSettings || onSelectFolder} title={isCollapsed ? 'Settings' : ''}>
          <Settings2Icon size={18} />
          {!isCollapsed && <span>Settings</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

