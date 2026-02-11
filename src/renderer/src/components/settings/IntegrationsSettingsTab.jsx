import React, { useState, useEffect } from 'react';
import { Monitor, Power, Copy, Check } from 'lucide-react';

const IntegrationsSettingsTab = ({
  discordRpcEnabled,
  onSetDiscordRpcEnabled,
  widgetServerEnabled,
  onSetWidgetServerEnabled,
}) => {
  const [widgetServerRunning, setWidgetServerRunning] = useState(widgetServerEnabled);
  const [widgetUrl, setWidgetUrl] = useState(widgetServerEnabled ? 'http://localhost:3737/docs' : '');
  const [copySuccess, setCopySuccess] = useState(false);
  const [serverOperation, setServerOperation] = useState(null);

  useEffect(() => {
    setWidgetServerRunning(widgetServerEnabled);
    setWidgetUrl(widgetServerEnabled ? 'http://localhost:3737/docs' : '');
  }, [widgetServerEnabled]);

  const handleStartServer = async () => {
    if (window.electronAPI && !serverOperation) {
      setServerOperation('starting');
      const result = await window.electronAPI.widgetStartServer(3737);
      if (result.success) {
        setWidgetServerRunning(true);
        setWidgetUrl(result.url + '/docs');
        onSetWidgetServerEnabled(true);
      } else {
        alert('Failed to start widget server: ' + result.error);
      }
      setServerOperation(null);
    }
  };

  const handleStopServer = async () => {
    if (window.electronAPI && !serverOperation) {
      setServerOperation('stopping');
      
      const result = await window.electronAPI.widgetStopServer();
      if (result.success) {
        setWidgetServerRunning(false);
        setWidgetUrl('');
        onSetWidgetServerEnabled(false);
      } else {
        console.error('Failed to stop widget server:', result.error);
      }
      setServerOperation(null);
    }
  };

  const handleCopyUrl = () => {
    const urlToCopy = widgetUrl || 'http://localhost:3737/docs';
    navigator.clipboard.writeText(urlToCopy);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <>
      {/* DISCORD RPC SECTION */}
      <div className="settings-section settings-card">
        <h3 className="settings-section-title">Discord Rich Presence</h3>
        <p className="settings-section-sub">Show current song on your Discord profile while playing.</p>
        <div className="settings-item">
          <label className="toggle-switch">
            <input type="checkbox" checked={discordRpcEnabled} onChange={e => onSetDiscordRpcEnabled(e.target.checked)} />
            <span className="switch-slider"></span>
          </label>
          <span className="settings-discord-desc">Enable Discord integration to display now-playing information.</span>
        </div>
      </div>

      {/* WIDGET SERVER SECTION */}
      <div className="settings-section settings-card">
        <h3 className="settings-section-title">
          <Monitor size={18} />
          Widget Server
          {widgetServerRunning && (
            <span className="widget-status-badge">
              <span className="status-dot-inline"></span>
              Running
            </span>
          )}
        </h3>
        <p className="settings-section-sub">
          Start a local HTTP + WebSocket server to display now-playing info in OBS, StreamLabs, or any browser source.
        </p>
        
        <div className="widget-server-actions">
          <button 
            className={`settings-button widget-power-btn ${widgetServerRunning ? 'active' : ''} ${serverOperation ? 'loading' : ''}`}
            onClick={widgetServerRunning ? handleStopServer : handleStartServer}
            disabled={serverOperation !== null}
            style={{ pointerEvents: serverOperation ? 'none' : 'auto' }}
          >
            <Power size={16} />
            {serverOperation === 'starting' && 'Starting...'}
            {serverOperation === 'stopping' && 'Stopping...'}
            {!serverOperation && (widgetServerRunning ? 'Stop Server' : 'Start Server')}
          </button>
          
          {widgetServerRunning && (
            <button 
              className="settings-button widget-browse-btn"
              onClick={() => window.electronAPI.openExternal('http://localhost:3737/widgets')}
            >
              <Monitor size={16} />
              Browse Themes
            </button>
          )}
        </div>
      </div>

      {widgetServerRunning && (
        <>
          <div className="settings-section settings-card widget-info-card">
            <h3 className="widget-info-title">
              <span className="widget-info-icon">📡</span>
              API Documentation
            </h3>
            <p className="settings-section-sub">
              View all endpoints, WebSocket protocol, and integration guides
            </p>
            
            <div className="widget-url-container">
              <input 
                type="text" 
                readOnly 
                value={widgetUrl || 'http://localhost:3737/docs'} 
                className="widget-url-input"
                onClick={(e) => e.target.select()}
              />
              <button 
                className={`settings-button copy-button ${copySuccess ? 'copied' : ''}`}
                onClick={handleCopyUrl}
              >
                {copySuccess ? <Check size={16} /> : <Copy size={16} />}
                {copySuccess ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default IntegrationsSettingsTab;
