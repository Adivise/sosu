import React from 'react';
import { X, FolderOpen, Trash2, Check } from 'lucide-react';
import './SettingsModal.css';

const SettingsModal = ({ isOpen, onClose, osuFolderPath, onSelectFolder, onRemoveFolder, discordRpcEnabled, onSetDiscordRpcEnabled, onClearCache, minDurationValue, setMinDurationValue }) => {

  if (!isOpen) return null;

  const handleClearCache = () => {
    if (window.confirm('Are you sure you want to rescan the songs cache? This will rescan your osu! Songs folder and reset all cached metadata.')) {
      onClearCache();
      onClose();
    }
  };

  const handleChangePath = () => {
    onSelectFolder();
    onClose();
  }

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
              <button className="settings-button primary" onClick={handleChangePath}>
                <FolderOpen size={16} /> {osuFolderPath ? 'Change Folder' : 'Select Folder'}
              </button>
              {osuFolderPath && (
              <button className="settings-button danger" onClick={handleClearCache}>
                  <Trash2 size={16} /> Re-scan
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
          
          {/* DURATION DISPLAY SECTION */}
          <div className="settings-section settings-card duration-display-section">
            <h3 className="duration-display-title">Duration Filter</h3>
            <p className="duration-display-description">Set the minimum duration for songs to appear in your library. Songs shorter than this value will be hidden.</p>
            
            <div className="duration-control-container">
              <div className="duration-control">
                <label className="duration-label">
                  Minimum Duration:
                </label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input 
                    type="number" 
                    min="0" 
                    max="10000" 
                    step="1" 
                    value={minDurationValue} 
                    onChange={e => setMinDurationValue(Math.max(0, Number(e.target.value) || 0))}
                    className="duration-input"
                  /> 
                  <span className="duration-unit">seconds</span>
                </div>
              </div>
            </div>
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
