import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, XCircle, Plus } from 'lucide-react';

const FiltersSettingsTab = ({
  minDurationValue,
  setMinDurationValue,
  dedupeTitlesEnabled,
  setDedupeTitlesEnabled,
  hiddenArtists,
  setHiddenArtists,
  nameFilter,
  setNameFilter,
  nameFilterMode,
  setNameFilterMode,
  getAllArtists,
  filterStats,
}) => {
  const [artistSearch, setArtistSearch] = useState('');
  const [artistDropdownOpen, setArtistDropdownOpen] = useState(false);
  const artistDropdownRef = useRef(null);
  const [titleTermDraft, setTitleTermDraft] = useState('');
  const [titleModeDropdownOpen, setTitleModeDropdownOpen] = useState(false);
  const titleModeDropdownRef = useRef(null);

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
    if (!artistDropdownOpen && !titleModeDropdownOpen) return;

    const onDocClick = (e) => {
      if (!artistDropdownRef.current && !titleModeDropdownRef.current) return;
      if (artistDropdownRef.current && !artistDropdownRef.current.contains(e.target)) {
        setArtistDropdownOpen(false);
      }
      if (titleModeDropdownRef.current && !titleModeDropdownRef.current.contains(e.target)) {
        setTitleModeDropdownOpen(false);
      }
    };
    document.addEventListener('click', onDocClick, true);

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
  }, [artistDropdownOpen, titleModeDropdownOpen]);

  const titleFilterEntries = useMemo(() => {
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

  const titleModeLabel = useMemo(() => {
    if (nameFilterMode === 'startswith') return 'Starts with';
    if (nameFilterMode === 'endswith') return 'Ends with';
    return 'Contains';
  }, [nameFilterMode]);

  return (
    <>
      {/* DUPLICATE FILTER SECTION */}
      <div className="settings-section settings-card">
        <h3 className="settings-section-title">Group by title</h3>
        <p className="settings-section-sub">
          Off: show every difficulty as a separate row so you can select any. On: show one entry per title and list other difficulties in a dropdown below the selected row.
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
          <span className="settings-discord-desc">Group by title (hide other difficulties in dropdown)</span>
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
  );
};

export default FiltersSettingsTab;
