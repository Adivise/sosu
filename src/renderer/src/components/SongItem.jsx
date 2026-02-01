import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Play, Pause, Music, Plus, X, Heart } from 'lucide-react';
import PlaylistMenu from './PlaylistMenu';
import ContextMenu from './ContextMenu';
import './SongItem.css';

const SongItem = ({ song, pageIndex = 0, index, isPlaying, isSelected, isHighlighted = false, onSelect, onPreviewSelect = null, onClearPreview = null, duration, isPlaylist, onRemoveFromPlaylist, allSongs, onAddToPlaylist, playlists, onCreatePlaylist = null, isFavorite = false, onToggleFavorite, onAddArtistToFilter = null, onOpenSongDetails = null, showSongBadges = false, playCount = 0, isMostPlayed = false }) => {
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const addButtonRef = useRef(null);
  const menuContainerRef = useRef(null);

  // Context menu state
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const contextRef = useRef(null);

  // Portal container element for the context menu (to avoid transform/stacking context issues)
  const [menuContainerEl, setMenuContainerEl] = useState(null);

  // create/destroy container when menu opens/closes
  useEffect(() => {
    if (contextMenuVisible) {
      const el = document.createElement('div');
      el.className = 'song-context-menu-root';
      document.body.appendChild(el);
      setMenuContainerEl(el);
      return () => {
        if (el.parentNode) el.parentNode.removeChild(el);
        setMenuContainerEl(null);
      };
    }
    return undefined;
  }, [contextMenuVisible]);

  // Submenu for "Add to playlist"
  const [playlistSubmenuVisible, setPlaylistSubmenuVisible] = useState(false);
  const [playlistSubmenuReady, setPlaylistSubmenuReady] = useState(false); // become true after measured
  const [playlistSubmenuPos, setPlaylistSubmenuPos] = useState({ x: -9999, y: -9999 });
  const playlistBtnRef = useRef(null);
  const playlistSubmenuRef = useRef(null);

  // Portal container for playlist submenu (detached to avoid clipping/transform issues)
  const [playlistPortalEl, setPlaylistPortalEl] = useState(null);
  useEffect(() => {
    if (playlistSubmenuVisible) {
      const el = document.createElement('div');
      el.className = 'song-context-playlist-root';
      document.body.appendChild(el);
      setPlaylistPortalEl(el);

      return () => {
        if (el.parentNode) el.parentNode.removeChild(el);
        setPlaylistPortalEl(null);
      };
    }
    return undefined;
  }, [playlistSubmenuVisible]);

  // Close context menu on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      // If click is inside the main context menu, ignore
      if (contextRef.current && contextRef.current.contains(e.target)) return;
      // If click is inside the playlist submenu portal, ignore so buttons there receive the event
      if (playlistSubmenuRef.current && playlistSubmenuRef.current.contains(e.target)) {
        return;
      }

      // Otherwise close menus
      setContextMenuVisible(false);
      setPlaylistSubmenuVisible(false);
      openedByClickRef.current = false;
      if (onClearPreview) onClearPreview();
    };
    if (contextMenuVisible) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [contextMenuVisible]);

  // Close on Escape key
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setContextMenuVisible(false);
        setPlaylistSubmenuVisible(false);
        openedByClickRef.current = false;
      }
    };
    if (contextMenuVisible) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [contextMenuVisible]);

  // Adjust context menu to be inside viewport after render
  useEffect(() => {
    if (!contextMenuVisible) return;
    // Wait for menu to render
    const id = setTimeout(() => {
      if (!contextRef.current) return;
      const r = contextRef.current.getBoundingClientRect();
      let { x, y } = contextMenuPos;
      const margin = 8;
      if (r.right > window.innerWidth - margin) {
        x = Math.max(margin, window.innerWidth - r.width - margin);
      }
      if (r.bottom > window.innerHeight - margin) {
        y = Math.max(margin, window.innerHeight - r.height - margin);
      }
      if (x !== contextMenuPos.x || y !== contextMenuPos.y) {
        setContextMenuPos({ x, y });
      }


    }, 0);
    return () => clearTimeout(id);
  }, [contextMenuVisible, contextMenuPos, playlistSubmenuVisible]);

  // Adjust playlist submenu to avoid overflowing the viewport (absolute positioning relative to menu)
  useEffect(() => {
    if (!playlistSubmenuVisible) {
      setPlaylistSubmenuReady(false);
      setPlaylistSubmenuPos({ x: -9999, y: -9999 });

      return;
    }

    // If there are no playlists, mark ready immediately so Create button is clickable
    if (!playlists || playlists.length === 0) {
      setPlaylistSubmenuReady(true);
      const btnEl = playlistBtnRef.current;
      if (btnEl) {
        const rect = btnEl.getBoundingClientRect();
        const margin = 8;
        const gap = 8; // prefer small gap

        // Estimate menu size (fallback)
        const estWidth = playlistSubmenuRef.current?.offsetWidth || 220;
        const estHeight = playlistSubmenuRef.current?.offsetHeight || 48;

        // Prefer right-side placement next to the button
        let xRight = Math.round(rect.right + gap);
        let xLeft = Math.round(rect.left - estWidth - gap);
        let x = xRight;

        // If right-side would overflow, try left-side
        if (x + estWidth > window.innerWidth - margin) {
          if (xLeft >= margin) {
            x = xLeft;
          } else {
            // clamp if neither side fits fully
            x = Math.max(margin, window.innerWidth - estWidth - margin);
          }
        }

        // If left-side is off-screen (negative), clamp to margin
        if (x < margin) x = margin;

        // Center vertically relative to button
        let y = Math.round(rect.top + Math.round((rect.height - estHeight) / 2));
        if (y + estHeight > window.innerHeight - margin) y = Math.max(margin, Math.round(window.innerHeight - margin - estHeight));
        if (y < margin) y = margin;

        setPlaylistSubmenuPos({ x, y });
      }
      return;
    }

    const id = setTimeout(() => {
      const submenuEl = playlistSubmenuRef.current;
      const btnEl = playlistBtnRef.current;
      if (!submenuEl || !btnEl) return;
      const margin = 8;

      submenuEl.style.left = '0px';
      submenuEl.style.top = '0px';
      submenuEl.style.visibility = 'hidden';

      const btnRect = btnEl.getBoundingClientRect();
      const subRect = submenuEl.getBoundingClientRect();

      // cache last measured subRect for later heuristics
      try { lastMeasuredSubRectRef.current = subRect; } catch (e) {}

      // Default: place to the right of the button (small overlap to avoid hover gap)
      const gap = 10;
      const overlap = 0; // pixels to overlap to prevent cursor gaps
      let x = Math.round(btnRect.right + gap - overlap);
      // Center vertically relative to the button (better alignment with desktop menus)
      let y = Math.round(btnRect.top + Math.round((btnRect.height - subRect.height) / 2));
      // slight vertical nudge to increase overlap and avoid hover gaps
      const overlapV = 2;
      y = y - overlapV;

      // If it overflows to the right edge, flip to left of the button (also overlap)
      if (x + subRect.width > window.innerWidth - margin) {
        x = Math.round(btnRect.left - subRect.width - gap + overlap);
      }

      // Adjust vertically if it overflows bottom
      if (y + subRect.height > window.innerHeight - margin) {
        y = Math.max(margin, Math.round(window.innerHeight - margin - subRect.height));
      }

      // Prevent going above top
      if (y < margin) y = margin;


      // Immediately apply computed coords to the DOM so it's visible even if React state updates lag.
      // Allow pointer events so user can move cursor into the submenu while it finishes animating.
      try {
        submenuEl.style.left = `${x}px`;
        submenuEl.style.top = `${y}px`;
        submenuEl.style.visibility = 'visible';
        submenuEl.style.opacity = '0.02';
        submenuEl.style.pointerEvents = 'auto';
        submenuEl.style.transform = 'translateX(-4px) scale(0.995)';
      } catch (e) {}
      setPlaylistSubmenuPos({ x, y });

      // Show it after layout has been applied and the coords are set
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {

          // remove the faint opacity and measuring transform so the CSS-ready animation runs
          try { submenuEl.style.opacity = ''; submenuEl.style.pointerEvents = ''; submenuEl.style.transform = ''; } catch (e) {}
          setPlaylistSubmenuReady(true);
        });
      });
    }, 0);

    return () => clearTimeout(id);
  }, [playlistSubmenuVisible, playlists]);

  const formatDuration = useCallback((seconds) => {
    if (!seconds || isNaN(seconds)) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Format play counts (e.g., 1200 -> 1.2k)
  const formatPlays = useCallback((n) => {
    const v = Number(n) || 0;
    if (v >= 1000000) return (v / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (v >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(v);
  }, []);

  const handleClick = useCallback(() => {
    if (onSelect) onSelect(song);
  }, [onSelect, song]);

  const handleAddToPlaylist = useCallback((e) => {
    e.stopPropagation();
    if (!playlists || playlists.length === 0) {
      alert('Please create a playlist first from "Your Playlists"');
      return;
    }
    setShowPlaylistMenu(true);

    // Position menu to stay within viewport
    setTimeout(() => {
      if (menuContainerRef.current && addButtonRef.current) {
        const menuRect = menuContainerRef.current.getBoundingClientRect();
        const buttonRect = addButtonRef.current.getBoundingClientRect();

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
  }, [playlists]);

  const handleOpenBeatmap = useCallback((e) => {
    e.stopPropagation();
    if (song?.beatmapSetId) {
      const beatmapUrl = song.beatmapId 
        ? `https://osu.ppy.sh/beatmapsets/${song.beatmapSetId}#osu/${song.beatmapId}`
        : `https://osu.ppy.sh/beatmapsets/${song.beatmapSetId}`;
      if (window.electronAPI?.openExternal) {
        window.electronAPI.openExternal(beatmapUrl);
      } else {
        window.open(beatmapUrl, '_blank');
      }
    }
  }, [song]);

  // ENTER ANIMATION: apply a small staggered delay so items pop in nicely
  const [entering, setEntering] = useState(true);
  useEffect(() => {
    let id = null;
    try {
      const delay = Math.max(0, Math.min(800, (pageIndex || 0) * 36));
      id = setTimeout(() => setEntering(false), delay + 280); // keep class during animation
    } catch (e) {}
    return () => { try { if (id) clearTimeout(id); } catch (e) {} };
  }, [pageIndex]);

  const containerStyle = entering ? { animationDelay: `${Math.max(0, (pageIndex || 0) * 36)}ms` } : {};

  const handleOpenFolder = useCallback(async (e) => {
    e.stopPropagation();
    if (!song?.folderPath) return;
    if (window.electronAPI?.openPath) {
      try {
        await window.electronAPI.openPath(song.folderPath);
      } catch (err) {
        /* ignore */
      }
    }
    setContextMenuVisible(false);
  }, [song]);

  const handleAddArtistToFilter = useCallback((e) => {
    e.stopPropagation();
    if (onAddArtistToFilter && song?.artist) {
      onAddArtistToFilter(song.artist);
    }
    setContextMenuVisible(false);
  }, [onAddArtistToFilter, song]);

  const handleOpenDetails = useCallback((e) => {
    e.stopPropagation();
    if (onOpenSongDetails) onOpenSongDetails(song);
    setContextMenuVisible(false);
  }, [onOpenSongDetails, song]);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // Do NOT preview-select on right-click to avoid highlighting when opening context menu
    // Use pageX/pageY adjusted for scroll to get reliable viewport coords
    const x = e.pageX - (window.scrollX || 0);
    const y = e.pageY - (window.scrollY || 0);
    setContextMenuPos({ x, y });
    setContextMenuVisible(true);
  }, [song]);

  const playlistHoverTimeoutRef = useRef(null);
  const openedByClickRef = useRef(false);

  useEffect(() => {
    return () => {
      clearTimeout(playlistHoverTimeoutRef.current);
    };
  }, []);

  const togglePlaylistSubmenu = useCallback((e) => {
    e.stopPropagation();
    if (!playlistBtnRef.current) return;
    // Opening: mark not ready so submenu stays hidden until positioned
    if (!playlistSubmenuVisible) {
      openedByClickRef.current = true;
      setPlaylistSubmenuReady(false);
      setPlaylistSubmenuPos({ x: -9999, y: -9999 });
      setPlaylistSubmenuVisible(true);
    } else {
      // Closing via click
      openedByClickRef.current = false;
      setPlaylistSubmenuVisible(false);
      setPlaylistSubmenuReady(false);
    }
  }, [playlistSubmenuVisible]);

  const handleAddToPlaylistSelect = useCallback((playlistId) => {
    let handled = false;
    if (onAddToPlaylist && playlistId != null) {
      try { onAddToPlaylist(playlistId, song); handled = true; } catch (e) { /* ignore */ }
    }

    // If the above didn't run (prop not passed), try a direct fallback to the App helper (exposed for debug)
    if (!handled && typeof window.__sosu_addSongToPlaylist === 'function') {
      try {
        window.__sosu_addSongToPlaylist(playlistId, song);
        handled = true;
      } catch (e) { /* ignore */ }
    }

    // Wait for the app to dispatch playlist-updated; if it doesn't happen within a short timeout, show a warning.
    const onUpdated = (ev) => {
      try {
        const d = ev.detail || {};
        // compare as strings to be robust
        if (String(d.playlistId) === String(playlistId) && d.song && String(d.song.id) === String(song.id)) {
          window.removeEventListener('sosu:playlist-updated', onUpdated);
          clearTimeout(timeout);
        }
      } catch (err) {}
    };
    window.addEventListener('sosu:playlist-updated', onUpdated);

    // Fallback: if update doesn't happen, try a last-resort add
    const timeout = setTimeout(() => {
      window.removeEventListener('sosu:playlist-updated', onUpdated);
      if (!handled) {
        if (typeof window.__sosu_addSongToPlaylist === 'function') {
          try { window.__sosu_addSongToPlaylist(playlistId, song); return; } catch (e) { /* ignore */ }
        }
      }
    }, 800);
    // cleanup when menus close
    setPlaylistSubmenuVisible(false);
    setContextMenuVisible(false);
  }, [onAddToPlaylist, song]);

  return (
    <div
      className={`song-item ${entering ? 'entering' : ''} ${isPlaying ? 'playing' : ''} ${isSelected ? 'selected' : ''} ${contextMenuVisible ? 'context-active' : ''} ${isHighlighted ? 'highlighted' : ''} ${isMostPlayed ? 'has-plays' : ''}`}
      data-song-id={song.id}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      style={containerStyle}
    >

      {menuContainerEl && contextMenuVisible && (
        <ContextMenu
          menuContainerEl={menuContainerEl}
          contextRef={contextRef}
          contextMenuPos={contextMenuPos}
          song={song}
          playlistSubmenuVisible={playlistSubmenuVisible}
          playlistBtnRef={playlistBtnRef}
          togglePlaylistSubmenu={togglePlaylistSubmenu}
          handleOpenBeatmap={handleOpenBeatmap}
          handleOpenFolder={handleOpenFolder}
          handleAddArtistToFilter={handleAddArtistToFilter}
          handleOpenDetails={handleOpenDetails}
        />
      )}

      {/* Playlist submenu rendered into its own portal root to avoid clipping/transform issues */}
      {playlistPortalEl && playlistSubmenuVisible && ReactDOM.createPortal(
        <div
          ref={playlistSubmenuRef}
          className={`context-submenu ${playlistSubmenuReady ? 'ready' : 'measuring'}`}
          style={{
            position: 'fixed',
            left: playlistSubmenuReady ? `${playlistSubmenuPos.x}px` : '-9999px',
            top: playlistSubmenuReady ? `${playlistSubmenuPos.y}px` : '-9999px',
            visibility: playlistSubmenuReady ? 'visible' : 'hidden',
            opacity: playlistSubmenuReady ? 1 : 0,
            pointerEvents: playlistSubmenuReady ? 'auto' : 'none',
            background: 'transparent',
            border: 'none',
            padding: 0,
            zIndex: 2300
          }}
          onClick={(e) => e.stopPropagation()}
>
          <PlaylistMenu
            playlists={playlists}
            onAddToPlaylist={(playlistId) => { handleAddToPlaylistSelect(playlistId); }}
            onClose={() => { setPlaylistSubmenuVisible(false); }}
            onCreate={() => {
              try { if (onCreatePlaylist) onCreatePlaylist(); window.dispatchEvent(new CustomEvent('sosu:create-playlist')); } catch(e) {}
              setPlaylistSubmenuVisible(false); setContextMenuVisible(false);
            }}
          />
        </div>,
        playlistPortalEl
      )}
      <div className="song-item-number">
        {/* Show the index number by default. Only show Pause icon when this is the selected playing song. Hover no longer swaps the number for Play. */}
        {isSelected && isPlaying ? (
          <Pause size={16} />
        ) : (
          <span className="number-text">{index.toString().padStart(2, '0')}</span>
        )}
      </div>
      <div className="song-item-title">
        <div className="song-item-image">
          {song.imageFile ? (
            <>
              <img 
                src={`osu://${encodeURIComponent(song.imageFile)}`} 
                alt={song.title}
                loading="lazy"
                onError={(e) => {
                  e.target.style.display = 'none';
                  const placeholder = e.target.nextElementSibling;
                  if (placeholder) placeholder.style.display = 'flex';
                }}
                onLoad={(e) => {
                  e.target.style.display = 'block';
                  const placeholder = e.target.nextElementSibling;
                  if (placeholder) placeholder.style.display = 'none';
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div 
              className="song-item-name" 
              title={song.title}
            >
              {song.title}
            </div> 

            {/* Flags for completeness (hidden when user disables badges) */}
            {showSongBadges && song.imageFile && (
              <span className="song-flag" title="Has cover art">🖼️</span>
            )}
            {showSongBadges && song.beatmapSetId && (
              <span className="song-flag" title="Has beatmap">🔗</span>
            )}

            {/* Duplicates count (only present when dedupe processed it) */}
            {showSongBadges && song.duplicatesCount > 0 && (
              <span className="duplicate-badge" title={`${song.duplicatesCount} hidden duplicates`}>
                {song.duplicatesCount}
              </span>
            )}
            {isMostPlayed && (
              <div className="song-item-plays">
                <span className="plays-badge" title={`${playCount} plays`}>{formatPlays(playCount)}</span>
              </div>
            )}
          </div> 
        </div>
      </div>
      <div 
        className="song-item-artist"
        title={song.artist}
      >
        {song.artist}
      </div>


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
        {onToggleFavorite && (
          <button
            className={`favorite-btn ${isFavorite ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(song.id);
            }}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            style={{ marginRight: 8 }}
          >
            <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>
    </div>
  );
};

// Memoize to avoid unnecessary re-renders on unrelated parent updates
function propsEqual(prev, next) {
  // Compare minimal props that affect rendering
  if (prev.song?.id !== next.song?.id) return false;
  if (prev.isPlaying !== next.isPlaying) return false;
  if (prev.isSelected !== next.isSelected) return false;
  if (prev.isHighlighted !== next.isHighlighted) return false;
  if (prev.isMostPlayed !== next.isMostPlayed) return false;
  if ((prev.playCount || 0) !== (next.playCount || 0)) return false;
  if ((prev.isFavorite || false) !== (next.isFavorite || false)) return false;
  // pageIndex affects animation timing but doesn't change the rendered content otherwise
  if ((prev.pageIndex || 0) !== (next.pageIndex || 0)) return false;
  return true;
}

export default React.memo(SongItem, propsEqual);