import { RotateCcw, Trash2 } from 'lucide-react';

const ResetSettingsTab = ({
  onResetSettings,
  onResetFull,
  onClearCache,
  onClose,
}) => {
  const handleClearAllWidgets = async () => {
    const confirmed = window.confirm(
      'Delete all custom widget themes?\n\n' +
      'This will remove all downloaded custom widgets (the default theme will remain).\n\n' +
      'This action cannot be undone.\n\n' +
      'Continue?'
    );
    
    if (confirmed && window.electronAPI?.clearAllWidgets) {
      try {
        const result = await window.electronAPI.clearAllWidgets();
        if (result.success) {
          alert('All custom widgets deleted successfully.');
        } else {
          alert('Error deleting widgets: ' + result.error);
        }
      } catch (err) {
        alert('Error deleting widgets: ' + err.message);
      }
    }
  };

  const handleClearCache = () => {
    const confirmed = window.confirm(
      'Rescan and clear songs cache?\n\n' +
      'This will clear all cached beatmap metadata and rescan your osu! Songs folder.\n\n' +
      'This may take a while depending on your library size.\n\n' +
      'Continue?'
    );
    
    if (confirmed && onClearCache) {
      onClearCache();
      onClose();
    }
  };
  return (
    <>
      {/* CLEAR WIDGETS SECTION */}
      <div className="settings-section settings-card danger-zone">
        <h3 className="settings-section-title danger">Clear Custom Widgets</h3>
        <p className="settings-section-sub danger">Remove all downloaded custom widget themes (default theme will remain).</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            className="settings-button danger"
            onClick={handleClearAllWidgets}
          >
            <Trash2 size={16} /> Delete Custom Widgets
          </button>
        </div>
      </div>

      {/* CLEAR CACHE SECTION */}
      <div className="settings-section settings-card danger-zone">
        <h3 className="settings-section-title danger">Clear Songs Cache</h3>
        <p className="settings-section-sub danger">Clear all cached beatmap metadata and rescan your osu! Songs folder.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            className="settings-button danger"
            onClick={handleClearCache}
          >
            <Trash2 size={16} /> Rescan & Clear Cache
          </button>
        </div>
      </div>

      {/* SETTINGS RESET SECTION */}
      <div className="settings-section settings-card danger-zone">
        <h3 className="settings-section-title danger">Settings Reset</h3>
        <p className="settings-section-sub danger">Reset settings only (visuals, filters, playback options). Your library data stays intact.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="settings-button danger"
            onClick={() => {
              if (window.confirm('Reset settings to defaults? This will NOT delete playlists, favorites, or cache.')) {
                onResetSettings && onResetSettings();
                onClose();
              }
            }}
          >
            <RotateCcw size={16} /> Reset Settings
          </button>
        </div>
      </div>

      {/* FULL RESET SECTION */}
      <div className="settings-section settings-card danger-zone">
        <h3 className="settings-section-title danger">Full Reset</h3>
        <p className="settings-section-sub danger">Clear everything: settings, playlists, favorites, cache, widgets, and profiles.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="settings-button danger"
            onClick={() => {
              if (window.confirm('Full reset? This will delete ALL local data, cache, widgets, and profiles.')) {
                onResetFull && onResetFull();
                onClose();
              }
            }}
          >
            <RotateCcw size={16} /> Full Reset
          </button>
        </div>
      </div>
    </>
  );
};

export default ResetSettingsTab;
