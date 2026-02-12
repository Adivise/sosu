import { FolderOpen } from 'lucide-react';

const GeneralSettingsTab = ({
  osuFolderPath,
  onSelectFolder,
  onClearCache,
  onClose,
  scanAllMaps,
  setScanAllMaps,
  itemsPerPage,
  setItemsPerPage,
  closeToTray,
  onSetCloseToTray,
  askBeforeClose,
  onSetAskBeforeClose,
  hardwareAcceleration,
  onSetHardwareAcceleration,
  totalScanned,
}) => {
  const handleClearCache = () => {
    if (window.confirm('Are you sure you want to rescan the songs cache? This will rescan your osu! Songs folder and reset all cached metadata.')) {
      onClearCache();
      onClose();
    }
  };

  const handleChangePath = () => {
    onSelectFolder();
    onClose();
  };

  return (
    <>
      {/* SONGS FOLDER SECTION */}
      <div className="settings-section settings-card">
        <h3 className="settings-section-title">Songs Folder</h3>
        <p className="settings-section-sub">Set or change the path to your osu! Songs folder.</p>
        <div className="settings-folder-controls-row">
          <button className="settings-button primary" onClick={handleChangePath}>
            <FolderOpen size={16} /> {osuFolderPath ? 'Change Folder' : 'Select Folder'}
          </button>
        </div>
        {osuFolderPath && (
          <>
            <div className="settings-folder-path">
              <div className="settings-folder-path-label">Current folder:</div>
              <div className="settings-folder-path-value" title={osuFolderPath}>
                {osuFolderPath}
              </div>
            </div>
            {totalScanned !== undefined && (
              <div className="settings-folder-stats" style={{ marginTop: '12px', padding: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>
                  Total scanned: <strong style={{ color: 'var(--accent-color)' }}>{totalScanned}</strong> beatmaps
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* SCAN SETTINGS SECTION */}
      <div className="settings-section settings-card">
        <h3 className="settings-section-title">Scan Settings</h3>
        <p className="settings-section-sub">Configure how beatmaps are scanned.</p>
        <div className="settings-item">
          <label className="toggle-switch">
            <input 
              type="checkbox" 
              checked={scanAllMaps} 
              onChange={(e) => {
                const next = e.target.checked;
                const shouldForceRescan = window.confirm(
                  'Change scan mode?\n\nYes = apply change and force a full rescan now\nNo = cancel'
                );

                if (!shouldForceRescan) return;

                setScanAllMaps(next);
                onClearCache(next);
                onClose();
              }} 
            />
            <span className="switch-slider"></span>
          </label>
          <span className="settings-discord-desc">
            Scan all beatmaps (including those without beatmapId). When disabled, only beatmaps with valid beatmapId will be scanned.
          </span>
        </div>
      </div>

      {/* SONGS PER PAGE SECTION */}
      <div className="settings-section settings-card">
        <h3 className="settings-section-title">Songs Per Page</h3>
        <p className="settings-section-sub">Set the number of songs to display per page.</p>
        
        <div className="duration-control-container">
          <div className="duration-control">
            <label className="duration-label">
              Songs Per Page:
            </label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input 
                type="number" 
                min="10" 
                max="500" 
                step="10" 
                value={itemsPerPage} 
                onChange={e => setItemsPerPage(Math.max(10, Number(e.target.value) || 50))}
                className="duration-input"
              /> 
              <span className="duration-unit">songs</span>
            </div>
          </div>
        </div>
      </div>

      {/* WINDOW BEHAVIOR SECTION */}
      <div className="settings-section settings-card">
        <h3 className="settings-section-title">Window Behavior</h3>
        <p className="settings-section-sub">Customize how the app closes and minimizes.</p>
        
        <div className="settings-item">
          <label className="toggle-switch">
            <input 
              type="checkbox" 
              checked={closeToTray} 
              onChange={(e) => onSetCloseToTray(e.target.checked)} 
            />
            <span className="switch-slider"></span>
          </label>
          <span className="settings-discord-desc">
            Keep the app running in the background - minimize to system tray instead of closing.
          </span>
        </div>

        <div className="settings-item" style={{ marginTop: '12px' }}>
          <label className="toggle-switch">
            <input 
              type="checkbox" 
              checked={askBeforeClose} 
              onChange={(e) => onSetAskBeforeClose(e.target.checked)} 
            />
            <span className="switch-slider"></span>
          </label>
          <span className="settings-discord-desc">
            Show a confirmation dialog before closing the app.
          </span>
        </div>
      </div>

      {/* HARDWARE ACCELERATION SECTION */}
      <div className="settings-section settings-card">
        <h3 className="settings-section-title">Hardware Acceleration</h3>
        <p className="settings-section-sub">Use your graphics card to improve app performance. Changes require restart.</p>
        
        <div className="settings-item">
          <label className="toggle-switch">
            <input 
              type="checkbox" 
              checked={hardwareAcceleration} 
              onChange={(e) => {
                const newValue = e.target.checked;
                const confirmed = window.confirm(
                  `${newValue ? 'Enable' : 'Disable'} GPU Acceleration?\n\n` +
                  `This will ${newValue ? 'use' : 'stop using'} your graphics card to improve performance.\n\n` +
                  'The app will restart to apply this change.\n\n' +
                  'Continue?'
                );
                
                if (confirmed) {
                  onSetHardwareAcceleration(newValue);
                  setTimeout(() => {
                    window.electronAPI.appRestart();
                  }, 500);
                }
              }} 
            />
            <span className="switch-slider"></span>
          </label>
          <span className="settings-discord-desc">
            Enable GPU acceleration to improve performance (app will restart automatically).
          </span>
        </div>
      </div>
    </>
  );
};

export default GeneralSettingsTab;
