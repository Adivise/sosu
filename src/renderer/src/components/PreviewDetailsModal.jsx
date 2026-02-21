import React, { useEffect, useState } from 'react';
import { ExternalLink, Folder, List } from 'lucide-react';
import './PreviewDetailsModal.css';

// Preview-only, detailed beatmap metadata modal (theme-aware)
export default function PreviewDetailsModal({ isOpen, onClose, beatmapData, duration = 0 }) {
  // Hooks must run unconditionally (before any early return)
  const [animateIn, setAnimateIn] = useState(false);
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => setAnimateIn(true), 20);
      return () => clearTimeout(t);
    }
    setAnimateIn(false);
  }, [isOpen]);

  if (!isOpen || !beatmapData || !beatmapData.metadata) return null;
  const m = beatmapData.metadata;

  const objects = Array.isArray(m.objects) ? m.objects : [];
  const timingPoints = Array.isArray(m.timingPoints) ? m.timingPoints : [];
  const difficultyPoints = Array.isArray(m.difficultyPoints) ? m.difficultyPoints : [];

  const counts = objects.reduce((acc, o) => {
    if (o.type & 2) acc.sliders += 1;
    else if (o.type & 8) acc.spinners += 1;
    else acc.circles += 1;
    return acc;
  }, { sliders: 0, spinners: 0, circles: 0 });

  const sliderTicks = objects.reduce((acc, o) => {
    if (o.type & 2) acc += Array.isArray(o.tickTimes) ? o.tickTimes.length : 0;
    return acc;
  }, 0);

  const sliderRepeats = objects.reduce((acc, o) => {
    if (o.type & 2) acc += Math.max(0, (o.slides || 1) - 1);
    return acc;
  }, 0);

  const comboColors = Array.isArray(m.comboColors) && m.comboColors.length ? m.comboColors : [];

  const formatMs = (ms) => {
    if (!ms) return '—';
    const s = Math.floor(ms / 1000);
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const _fmt2 = (v) => {
    if (v === undefined || v === null) return '—';
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(2) : '—';
  };

  // BPM helper: prefer explicit fields, fallback to timingPoints when available
  const bpmMin = m.bpmMin ?? (m.timingPoints && m.timingPoints.length ? Math.min(...m.timingPoints.filter(tp => tp.uninherited !== false && tp.beatLength>0).map(tp => 60000/tp.beatLength)) : null);
  const bpmMax = m.bpmMax ?? (m.timingPoints && m.timingPoints.length ? Math.max(...m.timingPoints.filter(tp => tp.uninherited !== false && tp.beatLength>0).map(tp => 60000/tp.beatLength)) : null);
  const bpmFirst = m.bpm ?? (m.timingPoints && m.timingPoints.length ? (m.timingPoints.find(tp => tp.uninherited !== false && tp.beatLength>0) ? Math.round(60000 / m.timingPoints.find(tp => tp.uninherited !== false && tp.beatLength>0).beatLength) : null) : null);
  const renderBpm = () => {
    if (bpmFirst) return `${Math.round(bpmFirst)}`;
    if (bpmMax) return `${Math.round(bpmMax)}`;
    return '—';
  };

  // Image source: prefer in-memory base64 when available (preview uses base64 often)
  const imageSrc = beatmapData.backgroundBase64 ? `data:image/jpeg;base64,${beatmapData.backgroundBase64}` : (beatmapData.backgroundFilename ? `osu://${encodeURIComponent(beatmapData.backgroundFilename)}` : null);

  // Mode fallback: parser doesn't always populate mode, default to 0 (Standard)
  const MODE_NAMES = ['Standard', 'Taiko', 'Catch', 'Mania'];
  const modeIndex = (typeof m.mode === 'number') ? m.mode : 0;

  return (
    <div className={`preview-modal-backdrop ${animateIn ? 'show' : ''}`} onClick={onClose}>
      <div className={`preview-modal ${animateIn ? 'show' : ''}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="preview-header">
          <div className="preview-header-left">
            <div className="preview-thumb">
              {imageSrc ? (
                <img src={imageSrc} alt={m.title} />
              ) : (
                <div className="thumb-fallback-large"> <List size={28} /> </div>
              )}
            </div>
            <div className="preview-title-wrap">
              <h2 className="preview-title" title={m.title || ''}>{m.title || 'Unknown'}</h2>
              <div className="preview-sub">{m.artist || 'Unknown Artist'} — {m.version || m.difficulty || 'Unknown'}</div>
            </div>
          </div>
          <div className="preview-actions">
            <button className="action-btn" onClick={() => {
              if (beatmapData.folderPath && window.electronAPI?.openPath) window.electronAPI.openPath(beatmapData.folderPath);
            }}><Folder size={14} /><span>Open folder</span></button>
            <button className="action-btn" onClick={() => { if (m.beatmapSetId && window.electronAPI?.openExternal) window.electronAPI.openExternal(m.beatmapId ? `https://osu.ppy.sh/beatmapsets/${m.beatmapSetId}#osu/${m.beatmapId}` : `https://osu.ppy.sh/beatmapsets/${m.beatmapSetId}`); }}><ExternalLink size={14} /><span>Open on osu!</span></button>
            <button className="close-primary" onClick={onClose}>Close</button>
          </div>
        </div>

        <div className="preview-body">
          <div className="preview-grid">
            <div className="preview-card">
              <div className="card-title">General</div>
              <div className="card-row"><strong>Title</strong><span title={m.title || ''}>{m.title || '—'}</span></div>
              <div className="card-row"><strong>Artist</strong><span>{m.artist || '—'}</span></div>
              <div className="card-row"><strong>Creator</strong><span>{m.creator || '—'}</span></div>
              <div className="card-row">
                <div className="card-left"><strong>Version</strong><div className="stat-hint">Difficulty name</div></div>
                <span>{m.version || m.difficulty || '—'}</span>
              </div>
              <div className="card-row">
                <div className="card-left"><strong>Mode</strong><div className="stat-hint">Game mode</div></div>
                <span>{MODE_NAMES[modeIndex] || `Mode ${modeIndex}`}</span>
              </div>
              <div className="card-row"><strong>Duration</strong><span>{formatMs(duration * 1000)}</span></div>
            </div>

            <div className="preview-card">
              <div className="card-title">Difficulty & Timing</div>
              <div className="card-row"><strong>AR</strong><span>{_fmt2(m.ar)}</span></div>
              <div className="card-row"><strong>CS</strong><span>{_fmt2(m.cs)}</span></div>
              <div className="card-row"><strong>OD</strong><span>{_fmt2(m.od)}</span></div>
              <div className="card-row"><strong>BPM</strong><span title={(bpmMin && bpmMax && bpmMin !== bpmMax) ? `Min: ${bpmMin.toFixed(2)}, Max: ${bpmMax.toFixed(2)}` : (bpmFirst ? `BPM: ${bpmFirst}` : '')}>{renderBpm()}</span></div>
              <div className="card-row"><strong>Slider multiplier</strong><span>{m.sliderMultiplier ?? '—'}</span></div>
              <div className="card-row"><strong>Slider tick rate</strong><span>{m.sliderTickRate ?? '—'}</span></div>
            </div>

            <div className="preview-card wide">
              <div className="card-title">Objects</div>
              <div className="card-row"><strong>Hit circles</strong><span>{counts.circles}</span></div>
              <div className="card-row"><strong>Sliders</strong><span>{counts.sliders}</span></div>
              <div className="card-row"><strong>Spinner</strong><span>{counts.spinners}</span></div>
              <div className="card-row"><strong>Total objects</strong><span>{objects.length}</span></div>
              <div className="card-row"><strong>Slider ticks</strong><span>{sliderTicks}</span></div>
              <div className="card-row"><strong>Slider repeats</strong><span>{sliderRepeats}</span></div>
            </div>

            <div className="preview-card wide">
              <div className="card-title">Combo colors</div>
              <div className="color-row">
                {comboColors.length ? comboColors.map((c,i) => (
                  <div key={i} className="color-swatch" title={c} style={{ background: c }} />
                )) : <div className="muted">No combo colors</div>}
              </div>
              <div style={{marginTop:8,fontSize:12,color:'rgba(255,255,255,0.55)'}}>Mode: <strong style={{color:'var(--accent-color)'}}>{MODE_NAMES[modeIndex] || `Mode ${modeIndex}`}</strong></div>
            </div>


            <div className="preview-card">
              <div className="card-title">Timing points (visible)</div>
              <div className="list-scroll">
                {timingPoints.length ? timingPoints.slice(0,20).map((tp, idx) => (
                  <div className="list-row" key={idx}><span className="muted">{Math.round(tp.time)}ms</span><span>{tp.beatLength>0 ? `BPM ${Math.round(60000/tp.beatLength)}` : 'SV' }{tp.kiai? ' • KIAI':''}{tp.uninherited===false ? ' • SV' : ''}</span></div>
                )) : <div className="muted">No timing points</div>}
              </div>
            </div>

            <div className="preview-card">
              <div className="card-title">Difficulty points (SV)</div>
              <div className="list-scroll">
                {difficultyPoints.length ? difficultyPoints.slice(0,20).map((dp, idx) => (
                  <div className="list-row" key={idx}><span className="muted">{Math.round(dp.time)}ms</span><span>SV {dp.sliderVelocity?.toFixed(2) ?? '—'}</span></div>
                )) : <div className="muted">No difficulty points</div>}
              </div>
            </div>

            <div className="preview-card wide">
              <div className="card-title">Kiai / Break Sections</div>
              <div className="list-scroll">
                {Array.isArray(m.kiaiSections) && m.kiaiSections.length ? m.kiaiSections.map((s,i) => {
                  const start = Number.isFinite(s.startTime) ? formatMs(Math.round(s.startTime)) : '—';
                  const end = Number.isFinite(s.endTime) ? formatMs(Math.round(s.endTime)) : '—';
                  return (<div className="list-row" key={i}><span className="muted">{start} — {end}</span><span>Kiai</span></div>);
                }) : <div className="muted">No kiai sections</div>}

                {Array.isArray(m.breakSections) && m.breakSections.length ? m.breakSections.map((b,i) => {
                  const start = Number.isFinite(b.startTime) ? formatMs(Math.round(b.startTime)) : '—';
                  const end = Number.isFinite(b.endTime) ? formatMs(Math.round(b.endTime)) : '—';
                  return (<div className="list-row" key={`br-${i}`}><span className="muted">{start} — {end}</span><span>Break</span></div>);
                }) : <div className="muted">No break sections</div>}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
