import React from 'react';

const AppearanceSettingsTab = ({
  albumArtBlur,
  onSetAlbumArtBlur,
  blurIntensity,
  onSetBlurIntensity,
  accentColor,
  onSetAccentColor,
  vuEnabled,
  onSetVuEnabled,
  showSongBadges,
  onSetShowSongBadges,
}) => {
  const presetColors = [
    { name: 'Spotify Green', color: '#1db954' },
    { name: 'Violet', color: '#8b5cf6' },
    { name: 'Pink', color: '#ec4899' },
    { name: 'Blue', color: '#3b82f6' },
    { name: 'Orange', color: '#f97316' },
    { name: 'Red', color: '#ef4444' },
    { name: 'Cyan', color: '#06b6d4' },
    { name: 'Yellow', color: '#eab308' },
  ];

  return (
    <>
      {/* ALBUM ART BLUR SECTION */}
      <div className="settings-section settings-card">
        <h3 className="settings-section-title">Visual Effects</h3>
        <div className="settings-item">
          <label className="toggle-switch">
            <input type="checkbox" checked={albumArtBlur} onChange={e => onSetAlbumArtBlur(e.target.checked)} />
            <span className="switch-slider"></span>
          </label>
          <span className="settings-discord-desc">Display blurred album art as background for an immersive experience.</span>
        </div>
        {albumArtBlur && (
          <div className="settings-item" style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px', fontWeight: '500' }}>
              Blur Intensity: {blurIntensity}px
            </label>
            <input 
              type="range" 
              min="10" 
              max="100" 
              step="1" 
              value={blurIntensity} 
              onChange={e => onSetBlurIntensity(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-color)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
              <span>Subtle (10px)</span>
              <span>Intense (100px)</span>
            </div>
          </div>
        )}
      </div>

      {/* THEME/ACCENT COLOR SECTION */}
      <div className="settings-section settings-card">
        <h3 className="settings-section-title">Theme</h3>
        <p className="settings-section-sub">Customize the accent color throughout the app.</p>
        
        {/* Color Picker */}
        <div className="theme-color-picker">
          <label className="theme-color-label">Accent Color:</label>
          <div className="theme-color-input-wrapper">
            <input 
              type="color" 
              value={accentColor} 
              onChange={(e) => onSetAccentColor(e.target.value)}
              className="theme-color-input"
            />
            <span className="theme-color-hex">{accentColor}</span>
          </div>
        </div>
        
        {/* Preset Colors */}
        <div className="theme-preset-colors">
          <span className="theme-preset-label">Presets:</span>
          <div className="theme-preset-grid">
            {presetColors.map(preset => (
              <button
                key={preset.color}
                className={`theme-preset-btn ${accentColor === preset.color ? 'active' : ''}`}
                style={{ backgroundColor: preset.color }}
                onClick={() => onSetAccentColor(preset.color)}
                title={preset.name}
              />
            ))}
          </div>
        </div>
      </div>

      {/* AUDIO VISUALIZER SECTION */}
      <div className="settings-section settings-card">
        <h3 className="settings-section-title">Audio Visualizer</h3>
        <div className="settings-item" style={{ marginTop: '12px' }}>
          <label className="toggle-switch">
            <input type="checkbox" checked={vuEnabled} onChange={e => onSetVuEnabled(e.target.checked)} />
            <span className="switch-slider"></span>
          </label>
          <span className="settings-discord-desc">Show or hide the audio visualizer above the player bar.</span>
        </div>
      </div>

      {/* SONG BADGES SECTION */}
      <div className="settings-section settings-card">
        <h3 className="settings-section-title">Badges</h3>
        <p className="settings-section-sub">Customize additional visual elements in the song list.</p>
        <div className="settings-item" style={{ marginTop: '12px' }}>
          <label className="toggle-switch">
            <input type="checkbox" checked={showSongBadges} onChange={e => onSetShowSongBadges(e.target.checked)} />
            <span className="switch-slider"></span>
          </label>
          <span className="settings-discord-desc">Toggle display of small badges in the songs list (cover art / beatmap / duplicate count)</span>
        </div>
      </div>
    </>
  );
};

export default AppearanceSettingsTab;
