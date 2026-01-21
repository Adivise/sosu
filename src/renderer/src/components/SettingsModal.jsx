import React, { useState, useEffect } from 'react';
import { X, FolderOpen, Trash2, Check, Monitor, Copy, Power } from 'lucide-react';
import './SettingsModal.css';

const SettingsModal = ({ isOpen, onClose, osuFolderPath, onSelectFolder, onRemoveFolder, discordRpcEnabled, onSetDiscordRpcEnabled, widgetServerEnabled, onSetWidgetServerEnabled, onClearCache, minDurationValue, setMinDurationValue }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [widgetServerRunning, setWidgetServerRunning] = useState(false);
  const [widgetUrl, setWidgetUrl] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (isOpen && activeTab === 'widget') {
      checkWidgetStatus();
    }
  }, [isOpen, activeTab]);

  const checkWidgetStatus = async () => {
    if (window.electronAPI) {
      const isRunning = await window.electronAPI.widgetIsRunning();
      setWidgetServerRunning(isRunning);
      
      if (isRunning) {
        const url = await window.electronAPI.widgetGetUrl();
        setWidgetUrl(url + '/docs');
      }
    }
  };

  const handleStartServer = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.widgetStartServer(3737);
      if (result.success) {
        setWidgetServerRunning(true);
        setWidgetUrl(result.url + '/docs');
        onSetWidgetServerEnabled(true); // Save state
      } else {
        alert('Failed to start widget server: ' + result.error);
      }
    }
  };

  const handleStopServer = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.widgetStopServer();
      if (result.success) {
        setWidgetServerRunning(false);
        setWidgetUrl('');
        onSetWidgetServerEnabled(false); // Save state
      }
    }
  };

  const handleCopyUrl = () => {
    if (widgetUrl) {
      navigator.clipboard.writeText(widgetUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

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

        {/* Tab Navigation */}
        <div className="settings-tabs">
          <button 
            className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
          <button 
            className={`settings-tab ${activeTab === 'widget' ? 'active' : ''}`}
            onClick={() => setActiveTab('widget')}
          >
            <Monitor size={16} />
            Widget
          </button>
        </div>

        <div className="settings-content">
          {/* GENERAL TAB */}
          {activeTab === 'general' && (
            <>
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
            </>
          )}

          {/* WIDGET TAB */}
          {activeTab === 'widget' && (
            <>
              <div className="settings-section settings-card">
                <h3 className="settings-section-title">
                  Widget Server
                  {widgetServerRunning && (
                    <span className="widget-status-badge">
                      <span className="status-dot-inline"></span>
                      Server Running
                    </span>
                  )}
                </h3>
                <p className="settings-section-sub">
                  Start a local web server to display now playing information in OBS or other streaming software.
                </p>
                <button 
                  className={`settings-button ${widgetServerRunning ? 'danger' : 'primary'}`}
                  onClick={widgetServerRunning ? handleStopServer : handleStartServer}
                >
                  <Power size={16} />
                  {widgetServerRunning ? 'Stop Server' : 'Start Server'}
                </button>
              </div>

              {widgetServerRunning && widgetUrl && (
                <div className="settings-section settings-card widget-url-card">
                  <p className="settings-section-sub">
                    Open the Widget & API Docs to view endpoints and setup. For OBS, use the theme URLs described there (e.g., /widget?theme=default) as a Browser Source.
                  </p>
                  
                  <div className="widget-url-container">
                    <input 
                      type="text" 
                      className="widget-url-input" 
                      value={widgetUrl} 
                      readOnly 
                      onClick={(e) => e.target.select()}
                    />
                    <button 
                      className="settings-button copy-button"
                      onClick={handleCopyUrl}
                    >
                      {copySuccess ? <Check size={16} /> : <Copy size={16} />}
                      {copySuccess ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  
                  
                  
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
