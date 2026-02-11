import { RotateCcw, Trash2 } from 'lucide-react';

const ResetSettingsTab = ({
  onResetApp,
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

      {/* RESET APP SECTION */}
      <div className="settings-section settings-card danger-zone">
        <h3 className="settings-section-title danger">Reset App</h3>
        <p className="settings-section-sub danger">Restore the entire app to factory defaults. All settings, playlists, favorites, and data will be cleared.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            className="settings-button danger"
            onClick={() => {
              if (window.confirm('Reset the app to default settings (like first run)? This will clear all local settings, playlists, favorites, and caches.')) {
                onResetApp && onResetApp();
                onClose();
              }
            }}
          >
            <RotateCcw size={16} /> Reset App to Defaults
          </button>
        </div>
      </div>
    </>
  );
};

export default ResetSettingsTab;
