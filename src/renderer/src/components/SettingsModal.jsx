import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, FolderOpen, Trash2, Check, Monitor, Copy, Power, Settings, Palette, Music, Database, RotateCcw, Filter, XCircle, Search, Plus } from 'lucide-react';
import './SettingsModal.css';

const SettingsModal = ({ isOpen, onClose, osuFolderPath, onSelectFolder, onRemoveFolder, discordRpcEnabled, onSetDiscordRpcEnabled, widgetServerEnabled, onSetWidgetServerEnabled, albumArtBlur, onSetAlbumArtBlur, blurIntensity, onSetBlurIntensity, accentColor, onSetAccentColor, onClearCache, minDurationValue, setMinDurationValue, itemsPerPage, setItemsPerPage, onExportData, onImportData, onResetApp, hiddenArtists, setHiddenArtists, nameFilter, setNameFilter, nameFilterMode, setNameFilterMode, getAllArtists, filterStats, scanAllMaps, setScanAllMaps, dedupeTitlesEnabled, setDedupeTitlesEnabled, showSongBadges, onSetShowSongBadges, totalScanned, vuEnabled, onSetVuEnabled }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [widgetServerRunning, setWidgetServerRunning] = useState(widgetServerEnabled);
  const [widgetUrl, setWidgetUrl] = useState(widgetServerEnabled ? 'http://localhost:3737/docs' : '');
  const [copySuccess, setCopySuccess] = useState(false);
  const [serverOperation, setServerOperation] = useState(null); // 'starting', 'stopping', or null
  const tabsRef = useRef(null);
  const [artistSearch, setArtistSearch] = useState('');
  const [artistDropdownOpen, setArtistDropdownOpen] = useState(false);
  const artistDropdownRef = useRef(null);
  const [titleTermDraft, setTitleTermDraft] = useState('');
  const [titleModeDropdownOpen, setTitleModeDropdownOpen] = useState(false);
  const titleModeDropdownRef = useRef(null);

  const titleFilterEntries = useMemo(() => {
    // Stored format: "mode::term, mode::term". Back-compat: "term" -> uses current mode.
    const raw = (nameFilter || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    return raw.map((item) => {
      const idx = item.indexOf('::');
      if (idx > 0) {
        return { mode: item.slice(0, idx), term: item.slice(idx + 2) };
      }
      return { mode: nameFilterMode, term: item };
    }).filter(e => e.term && ['contains', 'startswith', 'endswith'].includes(e.mode));
  }, [nameFilter, nameFilterMode]);

  const titleTermsByMode = useMemo(() => {
    const grouped = { contains: [], startswith: [], endswith: [] };
    for (const e of titleFilterEntries) grouped[e.mode].push(e.term);
    // dedupe (case-insensitive) while preserving order
    const dedupe = (arr) => {
      const seen = new Set();
      const out = [];
      for (const t of arr) {
        const k = (t || '').toLowerCase();
        if (!k || seen.has(k)) continue;
        seen.add(k);
        out.push(t);
      }
      return out;
    };
    grouped.contains = dedupe(grouped.contains);
    grouped.startswith = dedupe(grouped.startswith);
    grouped.endswith = dedupe(grouped.endswith);
    return grouped;
  }, [titleFilterEntries]);

  const serializeTitleTerms = (byMode) => {
    const parts = [];
    for (const mode of ['contains', 'startswith', 'endswith']) {
      for (const term of byMode[mode] || []) {
        const t = (term || '').trim();
        if (!t) continue;
        parts.push(`${mode}::${t}`);
      }
    }
    return parts.join(', ');
  };

  const addTitleTerm = (raw) => {
    const term = (raw || '').trim();
    if (!term) return;
    const list = titleTermsByMode[nameFilterMode] || [];
    const exists = list.some(t => (t || '').toLowerCase() === term.toLowerCase());
    if (exists) return;
    const next = { ...titleTermsByMode, [nameFilterMode]: [...list, term] };
    setNameFilter(serializeTitleTerms(next));
  };

  const removeTitleTerm = (mode, term) => {
    const list = titleTermsByMode[mode] || [];
    const next = { ...titleTermsByMode, [mode]: list.filter(t => t !== term) };
    setNameFilter(serializeTitleTerms(next));
  };

  const allArtists = useMemo(() => {
    try {
      return (getAllArtists ? getAllArtists() : []) || [];
    } catch {
      return [];
    }
  }, [getAllArtists]);

  const visibleArtistOptions = useMemo(() => {
    const q = (artistSearch || '').toLowerCase().trim();
    const hiddenSet = new Set((hiddenArtists || []).map(a => (a || '').toLowerCase().trim()));
    return allArtists
      .filter(a => a && !hiddenSet.has(a.toLowerCase().trim()))
      .filter(a => (q ? a.toLowerCase().includes(q) : true))
      .slice(0, 200);
  }, [allArtists, artistSearch, hiddenArtists]);

  useEffect(() => {
    // Only attach listeners while the modal is open and at least one dropdown is active
    if (!isOpen || (!artistDropdownOpen && !titleModeDropdownOpen)) return;

    const onDocClick = (e) => {
      if (!artistDropdownRef.current && !titleModeDropdownRef.current) return;
      if (artistDropdownRef.current && !artistDropdownRef.current.contains(e.target)) {
        setArtistDropdownOpen(false);
      }
      if (titleModeDropdownRef.current && !titleModeDropdownRef.current.contains(e.target)) {
        setTitleModeDropdownOpen(false);
      }
    };
    // Use capture phase so we detect outside clicks even if inner handlers stop propagation
    document.addEventListener('click', onDocClick, true);

    // Also listen for focus changes in capture phase to close dropdown when focus moves outside
    const onDocFocusIn = (e) => {
      if (!artistDropdownRef.current && !titleModeDropdownRef.current) return;
      if (artistDropdownRef.current && !artistDropdownRef.current.contains(e.target)) {
        setArtistDropdownOpen(false);
      }
      if (titleModeDropdownRef.current && !titleModeDropdownRef.current.contains(e.target)) {
        setTitleModeDropdownOpen(false);
      }
    };
    document.addEventListener('focusin', onDocFocusIn, true);

    return () => {
      document.removeEventListener('click', onDocClick, true);
      document.removeEventListener('focusin', onDocFocusIn, true);
    };
  }, [isOpen, artistDropdownOpen, titleModeDropdownOpen]);

  const titleModeLabel = useMemo(() => {
    if (nameFilterMode === 'startswith') return 'Starts with';
    if (nameFilterMode === 'endswith') return 'Ends with';
    return 'Contains';
  }, [nameFilterMode]);

  // Keep local state in sync with persisted flag to avoid flicker when opening the tab
  useEffect(() => {
    setWidgetServerRunning(widgetServerEnabled);
    setWidgetUrl(widgetServerEnabled ? 'http://localhost:3737/docs' : '');
  }, [widgetServerEnabled]);

  // Enable horizontal scroll with mouse wheel on tabs
  useEffect(() => {
    const tabsElement = tabsRef.current;
    if (!tabsElement) return;

    const handleWheel = (e) => {
      // Only handle horizontal scrolling when there's overflow
      const hasHorizontalScroll = tabsElement.scrollWidth > tabsElement.clientWidth;
      if (hasHorizontalScroll && e.deltaY !== 0) {
        e.preventDefault();
        e.stopPropagation();
        tabsElement.scrollLeft += e.deltaY;
      }
    };

    tabsElement.addEventListener('wheel', handleWheel, { passive: false });
    return () => tabsElement.removeEventListener('wheel', handleWheel);
  }, [isOpen]);

  const handleStartServer = async () => {
    if (window.electronAPI && !serverOperation) {
      setServerOperation('starting');
      const result = await window.electronAPI.widgetStartServer(3737);
      if (result.success) {
        setWidgetServerRunning(true);
        setWidgetUrl(result.url + '/docs');
        onSetWidgetServerEnabled(true); // Save state
      } else {
        alert('Failed to start widget server: ' + result.error);
      }
      setServerOperation(null);
    }
  };

  const handleStopServer = async () => {
    if (window.electronAPI && !serverOperation) {
      setServerOperation('stopping');
      
      // Call API
      const result = await window.electronAPI.widgetStopServer();
      if (result.success) {
        setWidgetServerRunning(false);
        setWidgetUrl('');
        onSetWidgetServerEnabled(false); // Save state
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
        <div className="settings-tabs" ref={tabsRef}>
          <button 
            className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            <Settings size={16} />
            General
          </button>
          <button 
            className={`settings-tab ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            <Palette size={16} />
            Appearance
          </button>
          <button 
            className={`settings-tab ${activeTab === 'integrations' ? 'active' : ''}`}
            onClick={() => setActiveTab('integrations')}
          >
            <Monitor size={16} />
            Integrations
          </button>
          <button 
            className={`settings-tab ${activeTab === 'filters' ? 'active' : ''}`}
            onClick={() => setActiveTab('filters')}
          >
            <Filter size={16} />
            Filters
          </button>
          <button 
            className={`settings-tab ${activeTab === 'data' ? 'active' : ''}`}
            onClick={() => setActiveTab('data')}
          >
            <Database size={16} />
            Data
          </button>
          <button 
            className={`settings-tab ${activeTab === 'reset' ? 'active' : ''}`}
            onClick={() => setActiveTab('reset')}
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>

        <div className="settings-content">
          {/* GENERAL TAB */}
          {activeTab === 'general' && (
            <>
              {/* SONGS FOLDER SECTION */}
              <div className="settings-section settings-card">
                <h3 className="settings-section-title">Songs Folder</h3>
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

                        // If user cancels, keep previous value (controlled input will "bounce back")
                        if (!shouldForceRescan) return;

                        // Apply new mode and force rescan
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
              

              {/* PAGINATION SECTION */}
              <div className="settings-section settings-card">
                <h3 className="settings-section-title">Pagination</h3>
                <p className="settings-section-sub">Set the number of songs to display per page.</p>
                
                <div className="duration-control-container">
                  <div className="duration-control">
                    <label className="duration-label">
                      Items Per Page:
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
                      <span className="duration-unit">items</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* APPEARANCE TAB */}
          {activeTab === 'appearance' && (
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
                    {[
                      { name: 'Spotify Green', color: '#1db954' },
                      { name: 'Violet', color: '#8b5cf6' },
                      { name: 'Pink', color: '#ec4899' },
                      { name: 'Blue', color: '#3b82f6' },
                      { name: 'Orange', color: '#f97316' },
                      { name: 'Red', color: '#ef4444' },
                      { name: 'Cyan', color: '#06b6d4' },
                      { name: 'Yellow', color: '#eab308' },
                    ].map(preset => (
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


              {/* Song badges (cover art / beatmap / duplicates) */}
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
          )}

          {/* INTEGRATIONS TAB */}
          {activeTab === 'integrations' && (
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
          )}

          {/* FILTERS TAB */}
          {activeTab === 'filters' && (
            <>
              <div className="settings-section settings-card">
                <h3 className="settings-section-title">Duplicate Filter</h3>
                <p className="settings-section-sub">
                  When enabled, only one song per song title will be shown in your library.
                </p>

                <div className="settings-item">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={!!dedupeTitlesEnabled}
                      onChange={(e) => setDedupeTitlesEnabled(e.target.checked)}
                    />
                    <span className="switch-slider"></span>
                  </label>
                  <span className="settings-discord-desc">Hide duplicate songs</span>
                </div>
              </div>
              {/* DURATION FILTER SECTION */}
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

              {/* ARTIST FILTER SECTION */}
              <div className="settings-section settings-card">
                <h3 className="settings-section-title">Artist Filter</h3>
                <p className="settings-section-sub">Hide songs by specific artists. Select artists from the dropdown to hide them.</p>

                <div className="artist-filter" ref={artistDropdownRef}>
                  <div className="artist-search-row">
                    <Search size={16} className="artist-search-icon" />
                    <input
                      className="artist-search-input"
                      type="text"
                      value={artistSearch}
                      onChange={(e) => setArtistSearch(e.target.value)}
                      onFocus={() => setArtistDropdownOpen(true)}
                      placeholder="Search artists..."
                    />
                    {artistSearch && (
                      <button
                        className="artist-search-clear"
                        onClick={() => {
                          setArtistSearch('');
                          setArtistDropdownOpen(true);
                        }}
                        type="button"
                        title="Clear"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  {artistDropdownOpen && (
                    <div className="artist-dropdown">
                      <div className="artist-dropdown-header">
                        <span>Click an artist to hide</span>
                        <span className="artist-dropdown-count">{visibleArtistOptions.length}</span>
                      </div>
                      <div className="artist-dropdown-list">
                        {visibleArtistOptions.length === 0 ? (
                          <div className="artist-dropdown-empty">No artists found</div>
                        ) : (
                          visibleArtistOptions.map((artist) => (
                            <button
                              key={artist}
                              type="button"
                              className="artist-dropdown-item"
                              onClick={() => {
                                if (artist && !hiddenArtists.includes(artist)) {
                                  setHiddenArtists([...hiddenArtists, artist]);
                                }
                                setArtistSearch('');
                                setArtistDropdownOpen(false);
                              }}
                            >
                              {artist}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {hiddenArtists.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                    {hiddenArtists.map(artist => (
                      <div
                        key={artist}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '20px',
                          fontSize: '13px',
                          color: 'rgba(255, 255, 255, 0.9)'
                        }}
                      >
                        <span>{artist}</span>
                        <button
                          onClick={() => setHiddenArtists(hiddenArtists.filter(a => a !== artist))}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'rgba(255, 255, 255, 0.6)',
                            cursor: 'pointer',
                            padding: '0',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <XCircle size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* TITLE FILTER SECTION */}
              <div className="settings-section settings-card">
                <h3 className="settings-section-title">Title Filter</h3>
                <p className="settings-section-sub">Hide songs by song name. Titles that match any term will be hidden.</p>
                
                <div style={{ marginBottom: '12px' }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(120px, 150px) minmax(0, 1fr) auto',
                      columnGap: '8px',
                      alignItems: 'stretch',
                      marginBottom: '8px'
                    }}
                  >
                    <div
                      ref={titleModeDropdownRef}
                      style={{ position: 'relative' }}
                    >
                      <button
                        type="button"
                        className="artist-search-row"
                        onClick={() => setTitleModeDropdownOpen((v) => !v)}
                        style={{
                          width: '100%',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          cursor: 'pointer',
                          height: '100%'
                        }}
                        title="Select filter mode"
                      >
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
                          {titleModeLabel}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>▾</span>
                      </button>

                      {titleModeDropdownOpen && (
                        <div className="artist-dropdown" style={{ top: 'calc(100% + 6px)' }}>
                          <div className="artist-dropdown-header">
                            <span>Select Mode</span>
                            <span className="artist-dropdown-count">3</span>
                          </div>
                          <div className="artist-dropdown-list" style={{ maxHeight: 200 }}>
                            {[
                              { value: 'contains', label: 'Contains' },
                              { value: 'startswith', label: 'Starts with' },
                              { value: 'endswith', label: 'Ends with' }
                            ].map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                className="artist-dropdown-item"
                                onClick={() => {
                                  setNameFilterMode(opt.value);
                                  setTitleModeDropdownOpen(false);
                                }}
                                style={{
                                  background:
                                    nameFilterMode === opt.value
                                      ? 'color-mix(in srgb, var(--accent-color) 18%, transparent)'
                                      : undefined,
                                  color:
                                    nameFilterMode === opt.value
                                      ? 'var(--accent-contrast, #fff)'
                                      : undefined
                                }}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="artist-search-row">
                      <Search size={16} className="artist-search-icon" />
                      <input
                        type="text"
                        value={titleTermDraft}
                        onChange={(e) => setTitleTermDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addTitleTerm(titleTermDraft);
                            setTitleTermDraft('');
                          }
                        }}
                        placeholder="Type a title to hide..."
                        className="artist-search-input title-filter-input"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        addTitleTerm(titleTermDraft);
                        setTitleTermDraft('');
                      }}
                      disabled={!titleTermDraft.trim()}
                      style={{
                        padding: '8px 12px',
                        background: titleTermDraft.trim() ? 'var(--accent-color)' : 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '8px',
                        color: titleTermDraft.trim() ? 'var(--accent-contrast, #000)' : 'rgba(255, 255, 255, 0.5)',
                        cursor: titleTermDraft.trim() ? 'pointer' : 'not-allowed',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                      title="Add title"
                    >
                      <Plus size={16} />
                      Add
                    </button>
                  </div>

                  {(titleTermsByMode[nameFilterMode]?.length > 0) && (
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {titleTermsByMode[nameFilterMode].map((term) => (
                          <div
                            key={`${nameFilterMode}::${term}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              borderRadius: '20px',
                              fontSize: '13px',
                              color: 'rgba(255, 255, 255, 0.9)',
                            }}
                          >
                            <span>{term}</span>
                            <button
                              type="button"
                              onClick={() => removeTitleTerm(nameFilterMode, term)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'rgba(255, 255, 255, 0.6)',
                                cursor: 'pointer',
                                padding: '0',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                              title="Remove"
                            >
                              <XCircle size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* FILTER STATS */}
              {filterStats && (
                <div className="settings-section settings-card">
                  <h3 className="settings-section-title">Filter Statistics</h3>
                  <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>
                    <div style={{ marginBottom: '8px' }}>
                      Total: <strong style={{ color: 'var(--accent-color)' }}>{filterStats.total}</strong> songs
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      Visible: <strong style={{ color: 'var(--accent-color)' }}>{filterStats.visible}</strong> songs
                    </div>
                    <div>
                      Hidden: <strong style={{ color: 'rgba(255, 68, 68, 0.78)' }}>{filterStats.hidden}</strong> songs
                    </div>
                    {filterStats.hiddenBy && (
                      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ marginBottom: '6px', opacity: 0.9, fontSize: '13px' }}>
                          Hidden breakdown
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: '6px', columnGap: '12px', fontSize: '13px' }}>
                          <div style={{ opacity: 0.8 }}>By duration</div>
                          <div><strong style={{ color: 'rgba(255, 68, 68, 0.78)' }}>{filterStats.hiddenBy.duration ?? 0}</strong></div>
                          <div style={{ opacity: 0.8 }}>By artist</div>
                          <div><strong style={{ color: 'rgba(255, 68, 68, 0.78)' }}>{filterStats.hiddenBy.artist ?? 0}</strong></div>
                          <div style={{ opacity: 0.8 }}>By title terms</div>
                          <div><strong style={{ color: 'rgba(255, 68, 68, 0.78)' }}>{filterStats.hiddenBy.title ?? 0}</strong></div>
                          <div style={{ opacity: 0.8 }}>By duplicate</div>
                          <div><strong style={{ color: 'rgba(255, 68, 68, 0.78)' }}>{filterStats.duplicate ?? 0}</strong></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* DATA TAB */}
          {activeTab === 'data' && (
            <>
              {/* BACKUP/RESTORE SECTION */}
              {onExportData && onImportData && (
                <div className="settings-section settings-card">
                  <h3 className="settings-section-title">Backup & Restore</h3>
                  <p className="settings-section-sub">Export or import your playlists, favorites, and settings.</p>
                  
                  <div className="backup-restore-buttons">
                    <button className="settings-button primary" onClick={onExportData}>
                      Export Data
                    </button>
                    <label className="settings-button" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      Import Data
                      <input
                        type="file"
                        accept=".json"
                        onChange={onImportData}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                </div>
              )}
            </>
          )}

          {/* RESET TAB */}
          {activeTab === 'reset' && (
            <>
              <div className="settings-section settings-card danger-zone">
                <h3 className="settings-section-title danger">Reset App</h3>
                <p className="settings-section-sub danger">Restore all settings and data to factory defaults. This will clear playlists, favorites, EQ, theme, history, and caches.</p>
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
          )}
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;
