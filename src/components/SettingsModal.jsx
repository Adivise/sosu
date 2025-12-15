import React from 'react';
import { X, FolderOpen, Trash2 } from 'lucide-react';
import './SettingsModal.css';

const SettingsModal = ({ isOpen, onClose, osuFolderPath, onSelectFolder, onRemoveFolder, discordRpcEnabled, onSetDiscordRpcEnabled, onClearCache, minDurationValue, setMinDurationValue }) => {
  if (!isOpen) return null;

  const handleClearCache = () => {
    if (window.confirm('Are you sure you want to clear the songs cache? This will rescan your osu! Songs folder and reset all cached metadata.')) {
      onClearCache();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Settings</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="settings-content">

          {/* SONGS FOLDER SECTION */}
          <div className="settings-section settings-card">
            <h3 className="settings-section-title">Songs Folder</h3>

            {/* DURATION FILTER */}
            <p className="settings-section-sub">Set or change the path to your osu! Songs folder.</p>
            <div className="settings-folder-controls-row">
              <button className="settings-button primary" onClick={onSelectFolder}>
                <FolderOpen size={16} /> {osuFolderPath ? 'Change Folder' : 'Select Folder'}
              </button>
              {osuFolderPath && (
                <button className="settings-button danger outline" onClick={onRemoveFolder}>
                  <Trash2 size={15} /> Remove
                </button>
              )}
            </div>
            {osuFolderPath && (
              <div className="settings-folder-path">
                <div className="settings-folder-path-label">Current folder:</div>
                <div className="settings-folder-path-value" title={osuFolderPath}>
                  {osuFolderPath}
                </div>
              </div>
            )}
          </div>
          <div className="settings-section settings-card">
            <h3 className="settings-section-title">Duration Display</h3>
            <div className="duration-control">
              <label className="duration-label">
                Min:
                <input 
                  type="number" 
                  min="0" 
                  max="10000" 
                  step="1" 
                  value={minDurationValue} 
                  onChange={e => setMinDurationValue(Math.max(0, Number(e.target.value) || 0))}
                  className="duration-input"
                /> 
                seconds
              </label>
            </div>
            <span className="settings-discord-desc">
              Only songs longer than this duration will be displayed in your library
            </span>
          </div>

          {/* CLEAR CACHE SECTION */}
          <div className="settings-section settings-card danger-zone">
            <h3 className="settings-section-title danger">Danger Zone</h3>
            <p className="settings-section-sub danger">Clearing the songs cache will delete ALL scanned metadata and instantly re-scan your osu! Songs folder. Use this if you moved, added, or deleted beatmaps and want a fresh rescan.</p>
            <button className="settings-button danger" onClick={handleClearCache}>
              <Trash2 size={16} /> Clear Songs Cache
            </button>
          </div>

          {/* DISCORD RPC SECTION */}
          <div className="settings-section settings-card">
            <h3 className="settings-section-title">Discord Rich Presence</h3>
            <div className="settings-item">
              <label className="toggle-switch">
                <input type="checkbox" checked={discordRpcEnabled} onChange={e => onSetDiscordRpcEnabled(e.target.checked)} />
                <span className="switch-slider"></span>
              </label>
              <span className="settings-discord-desc">Show current song on your Discord profile while playing.</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
