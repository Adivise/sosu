import { useRef, useEffect } from 'react';
import { PlayCircle } from 'lucide-react';
import './PlaylistMenu.css'; // reuse playlist menu styles for identical appearance

// Renders a portal-friendly submenu that mirrors PlaylistMenu visual style
export default function PreviewDuplicatesMenu({ song, onPreview, onPreviewItem, onClose }) {
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

  const formatDuration = (s) => {
    if (!s) return '';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  return (
    <div ref={menuRef} className="playlist-menu">
      <div className="playlist-menu-header">Preview Beatmap</div>
      <div className="playlist-menu-list">
        <button
          className="playlist-menu-item"
          onClick={() => { if (onPreview) onPreview(song); onClose(); }}
        >
          <PlayCircle size={16} />
          <span>Preview (this)</span>
          <span className="playlist-menu-count">{song.duration ? formatDuration(song.duration) : ''}</span>
        </button>

        <div className="playlist-menu-empty" style={{ paddingTop: 6, paddingBottom: 6 }}>
          {Array.isArray(song.duplicates) && song.duplicates.length > 0 ? 'Hidden duplicates' : 'No hidden duplicates'}
        </div>

        {Array.isArray(song.duplicates) && song.duplicates.length > 0 && (
          song.duplicates.map(d => (
            <button
              key={d.id}
              className="playlist-menu-item"
              onClick={() => { if (onPreviewItem) onPreviewItem(d); onClose(); }}
            >
              <PlayCircle size={14} />
              <span>{d.version || d.folderPath || d.title}</span>
              <span className="playlist-menu-count">{d.duration ? formatDuration(d.duration) : ''}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
