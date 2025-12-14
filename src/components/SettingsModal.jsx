import React from 'react';
import { X, FolderOpen } from 'lucide-react';
import './SettingsModal.css';

const SettingsModal = ({ isOpen, onClose, osuFolderPath, onSelectFolder, onRemoveFolder, discordRpcEnabled, onSetDiscordRpcEnabled }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Settings</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="settings-content">
          <div className="settings-section">
            <h3 className="settings-section-title">Songs Folder</h3>
            <div className="settings-item">
              <div className="settings-folder-controls">
                <button 
                  className="settings-button primary"
                  onClick={onSelectFolder}
                >
                  <FolderOpen size={16} />
                  <span>{osuFolderPath ? 'Change Folder' : 'Select Folder'}</span>
                </button>
                {osuFolderPath && (
                  <button 
                    className="settings-button danger"
                    onClick={onRemoveFolder}
                  >
                    Remove
                  </button>
                )}
              </div>
              {osuFolderPath && (
                <div className="settings-folder-path">
                  <span className="settings-folder-path-label">Current folder:</span>
                  <span className="settings-folder-path-value" title={osuFolderPath}>
                    {osuFolderPath}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="settings-section">
            <h3 className="settings-section-title">Discord Rich Presence</h3>
            <div className="settings-item">
              <label className="toggle-switch">
                <input type="checkbox" checked={discordRpcEnabled} onChange={e => onSetDiscordRpcEnabled(e.target.checked)} />
                <span className="switch-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;

