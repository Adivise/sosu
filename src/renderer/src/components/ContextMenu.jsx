import React from 'react';
import ReactDOM from 'react-dom';
import { Music, ExternalLink, Folder, Plus, ChevronRight, UserX, Info } from 'lucide-react';

const ContextMenu = React.memo(({
  menuContainerEl,
  contextRef,
  contextMenuPos,
  song,
  playlistSubmenuVisible,
  playlistBtnRef,
  togglePlaylistSubmenu,
  handleOpenBeatmap,
  handleOpenFolder,
  handleAddArtistToFilter,
  handleOpenDetails
}) => {
  if (!menuContainerEl) return null;

  const onAddArtistClick = (e) => {
    e.stopPropagation();
    if (!song?.artist) return;
    const ok = window.confirm(`Add "${song.artist}" to Hidden Artists?`);
    if (ok && typeof handleAddArtistToFilter === 'function') {
      // Pass the original event through so parent can close menus
      handleAddArtistToFilter(e);
    }
  };

  return ReactDOM.createPortal(
    <div
      ref={contextRef}
      className="context-menu"
      style={{ top: `${contextMenuPos.y}px`, left: `${contextMenuPos.x}px`, position: 'fixed' }}
    >
      <div className="context-menu-header">
        <div className="context-menu-thumb">
          {song.imageFile ? (
            <img src={`osu://${encodeURIComponent(song.imageFile)}`} alt={song.title} />
          ) : (
            <div className="thumb-placeholder"><Music size={18} /></div>
          )}
        </div>
        <div className="context-menu-meta">
          <div className="context-menu-title">{song.title}</div>
          <div className="context-menu-subtitle">{song.artist || 'Unknown Artist'}</div>
        </div>
      </div>

      <div className="context-menu-sep" />

      <div className="context-menu-items">
        <button className="context-menu-item" onClick={handleOpenBeatmap} disabled={!song.beatmapSetId}>
          <ExternalLink size={14} className="menu-icon" /> Open Beatmap
        </button>

        <button className="context-menu-item" onClick={handleOpenFolder} disabled={!song.folderPath}>
          <Folder size={14} className="menu-icon" /> Open Folder
        </button>

        <div style={{ position: 'relative' }}>
          <button
            className={`context-menu-item has-submenu ${playlistSubmenuVisible ? 'open' : ''}`}
            ref={playlistBtnRef}
            onClick={(e) => { e.stopPropagation(); togglePlaylistSubmenu(e); }}
            aria-haspopup="menu"
            aria-expanded={playlistSubmenuVisible}
          >
            <Plus size={14} className="menu-icon" /> Add to Playlist
            <span className="submenu-caret" aria-hidden="true"><ChevronRight size={14} /></span>
          </button>

          {/* Playlist submenu will render into its own portal attached to document.body */}
        </div>
        <div className="context-menu-sep" />

        <button className="context-menu-item" onClick={onAddArtistClick} disabled={!song.artist}>
          <UserX size={14} className="menu-icon" /> Add to Artist Filter
        </button>

        <div className="context-menu-sep" />

        <button className="context-menu-item" onClick={handleOpenDetails}>
          <Info size={14} className="menu-icon" /> Open More Details
        </button>
      </div>
    </div>,
    menuContainerEl
  );
});

export default ContextMenu;
