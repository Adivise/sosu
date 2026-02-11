import { useCallback, useState } from 'react';
import { Music, ExternalLink, Folder } from 'lucide-react';
import './SongDetailsModal.css';

const SongDetailsModal = ({ isOpen, song, onClose }) => {
  if (!isOpen || !song) return null;

  const openBeatmap = useCallback(() => {
    if (!song?.beatmapSetId) return;
    const url = song.beatmapId
      ? `https://osu.ppy.sh/beatmapsets/${song.beatmapSetId}#osu/${song.beatmapId}`
      : `https://osu.ppy.sh/beatmapsets/${song.beatmapSetId}`;
    if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url);
    else window.open(url, '_blank');
  }, [song]);

  const openFolder = useCallback(() => {
    if (!song?.folderPath) return;
    if (window.electronAPI?.openPath) window.electronAPI.openPath(song.folderPath);
  }, [song]);

  const [showTitleUnicode, setShowTitleUnicode] = useState(false);
  const [showArtistUnicode, setShowArtistUnicode] = useState(false);

  const MODE_NAMES = ['Standard', 'Taiko', 'Catch', 'Mania'];

  const formatDuration = (s) => {
    if (!s || isNaN(s)) return '—';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const bpmMin = song.bpmMin;
  const bpmMax = song.bpmMax ?? null; // explicit max if available
  const bpmFirst = song.bpm ?? (bpmMax ?? null); // osu! style (first timing point) preferred

  const renderBpm = () => {
    if (bpmFirst) return `${Math.round(bpmFirst)}`;
    if (bpmMax) return `${Math.round(bpmMax)}`;
    return '—';
  };

  return (
    <div className="details-modal-backdrop" onClick={onClose}>
      <div className="details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="details-header">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="details-thumb">
              {song.imageFile ? (
                <img src={`osu://${encodeURIComponent(song.imageFile)}`} alt={song.title} />
              ) : (
                <div className="thumb-fallback"><Music size={32} /></div>
              )}
            </div>
            <div>
              <h3 className="details-title clickable" onClick={() => song.titleUnicode && setShowTitleUnicode(s => !s)} title={song.titleUnicode ? 'Click to toggle Unicode title' : ''}>
                {showTitleUnicode && song.titleUnicode ? song.titleUnicode : song.title}
                {song.titleUnicode && <span className="unicode-badge"> Ⓤ</span>}
              </h3>
              <div className={`details-subtitle ${song.artistUnicode ? 'clickable' : ''}`} onClick={() => song.artistUnicode && setShowArtistUnicode(s => !s)} title={song.artistUnicode ? 'Click to toggle Unicode artist' : ''}>
                {showArtistUnicode && song.artistUnicode ? song.artistUnicode : (song.artist || 'Unknown Artist')}
                {song.artistUnicode && <span className="unicode-badge"> Ⓤ</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="details-body">
          <div className="details-row"><strong>Creator:</strong> <span className="muted">{song.creator || song.artist || '—'}</span></div>
          <div className="details-row"><strong>BPM:</strong> <span className="muted" title={(bpmMin && bpmMax && bpmMin !== bpmMax) ? `Min: ${bpmMin.toFixed(2)}, Max: ${bpmMax.toFixed(2)}` : (bpmFirst ? `BPM: ${bpmFirst.toFixed(2)}` : '')}>{renderBpm()}</span></div>
          <div className="details-row"><strong>Version:</strong> <span className="muted">{song.version || '—'}</span></div>
          <div className="details-row"><strong>Mode:</strong> <span className="muted">{typeof song.mode === 'number' ? (MODE_NAMES[song.mode] || `Mode ${song.mode}`) : '—'}</span></div>
          <div className="details-row"><strong>Album:</strong> <span className="muted">{song.album || '—'}</span></div>
          <div className="details-row"><strong>Duration:</strong> <span className="muted">{formatDuration(song.duration)}</span></div>
          <div className="details-row"><strong>BeatmapSet ID:</strong> <span className="muted">{song.beatmapSetId || '—'}</span></div>
          <div className="details-row"><strong>Beatmap ID:</strong> <span className="muted">{song.beatmapId || '—'}</span></div>
          <div className="details-row fullwidth"><strong>Folder:</strong> <span className="muted">{song.folderPath || '—'}</span></div>
        </div>

        <div className="details-footer" style={{ gap: 8 }}>
          <button className="action-btn" onClick={openBeatmap} disabled={!song.beatmapSetId}><ExternalLink size={14} /> <span>Open Beatmap</span></button>
          <button className="action-btn" onClick={openFolder} disabled={!song.folderPath}><Folder size={14} /> <span>Open Folder</span></button>
          <button className="close-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default SongDetailsModal;