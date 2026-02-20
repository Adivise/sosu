import { useEffect, useRef, useState } from 'react';
import { X, Settings, Monitor, Filter } from 'lucide-react';
import './SettingsModal.css';

const BeatmapViewerSettings = ({
  onClose,
  masterVolume, setMasterVolume,
  musicVolume, setMusicVolume,
  backgroundDim, setBackgroundDim,
  backgroundBlur, setBackgroundBlur,
  showGrid, setShowGrid,
}) => {
  const [activeTab, setActiveTab] = useState('audio');
  const tabsRef = useRef(null);

  useEffect(() => {
    const tabsElement = tabsRef.current;
    if (!tabsElement) return;
    const handler = (e) => {
      const hasHorizontalScroll = tabsElement.scrollWidth > tabsElement.clientWidth;
      if (hasHorizontalScroll && e.deltaY !== 0) {
        e.preventDefault();
        e.stopPropagation();
        tabsElement.scrollLeft += e.deltaY;
      }
    };
    tabsElement.addEventListener('wheel', handler, { passive: false });
    return () => tabsElement.removeEventListener('wheel', handler);
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Settings</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        {/* Tab Navigation (match SettingsModal) */}
        <div className="settings-tabs" ref={tabsRef}>
          <button className={`settings-tab ${activeTab === 'audio' ? 'active' : ''}`} onClick={() => setActiveTab('audio')}>
            <Settings size={16} />
            Audio
          </button>
          <button className={`settings-tab ${activeTab === 'background' ? 'active' : ''}`} onClick={() => setActiveTab('background')}>
            <Monitor size={16} />
            Background
          </button>
          <button className={`settings-tab ${activeTab === 'gameplay' ? 'active' : ''}`} onClick={() => setActiveTab('gameplay')}>
            <Filter size={16} />
            Gameplay
          </button>

        </div>

        <div className="settings-content">
          {/* AUDIO TAB */}
          {activeTab === 'audio' && (
            <div className="settings-section settings-card">
              <h3 className="settings-section-title">Audio</h3>
              <p className="settings-section-sub">Configure preview audio for the previews.</p>
              <div className="settings-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div className="settings-label-large">Master Volume</div>
                  <div className="settings-value">{Math.round(masterVolume * 100)}%</div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={masterVolume}
                  onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-color)', marginTop: 8 }}
                />
              </div>
              <div className="settings-separator" />
              <div className="settings-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div className="settings-label-large">Music Volume</div>
                  <div className="settings-value">{Math.round(musicVolume * 100)}%</div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={musicVolume}
                  onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-color)', marginTop: 8 }}
                />
              </div>

            </div>
          )}

          {/* BACKGROUND TAB */}
          {activeTab === 'background' && (
            <div className="settings-section settings-card">
              <h3 className="settings-section-title">Background</h3>
              <p className="settings-section-sub">Background display settings for the preview canvas.</p>
              <div className="settings-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div className="settings-label-large">Background Dim</div>
                  <div className="settings-value">{Math.round(backgroundDim * 100)}%</div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={backgroundDim}
                  onChange={(e) => setBackgroundDim(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-color)', marginTop: 8 }}
                />
              <div className="settings-separator" />
              </div>
              <div className="settings-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div className="settings-label-large">Background Blur</div>
                  <div className="settings-value">{backgroundBlur}px</div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={backgroundBlur}
                  onChange={(e) => setBackgroundBlur(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-color)', marginTop: 8 }}
                />
              </div>
            </div>
          )}

          {/* GAMEPLAY TAB */}
          {activeTab === 'gameplay' && (
            <div className="settings-section settings-card">
              <h3 className="settings-section-title">Gameplay</h3>
              <p className="settings-section-sub">Preview-only gameplay options and debug overlays.</p>
              <div className="settings-item">
                <label className="toggle-switch">
                  <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
                  <span className="switch-slider"></span>
                </label>
                <span className="settings-discord-desc">Show Grid</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BeatmapViewerSettings;
