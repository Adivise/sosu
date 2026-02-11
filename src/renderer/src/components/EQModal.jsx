import { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import './EQModal.css';

const EQModal = ({
  isOpen,
  onClose,
  bands = [],
  onBandChange,
  presets = [],
  onSetPreset,
  onSavePreset,
}) => {
  const [selectedPresetName, setSelectedPresetName] = useState(null);

  // --- HOOKS (must always be called in same order)
  useEffect(() => {
    if (!isOpen) setSelectedPresetName(null);
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Track modified bands (anything not near 0 dB)
  const modifiedBands = bands.filter(b => Math.abs(b.gain) > 0.05);
  const modifiedCount = modifiedBands.length;

  const handleFineChange = useCallback(
    (idx, delta) => {
      const cur = bands[idx]?.gain ?? 0;
      const next = Math.max(-12, Math.min(12, +(cur + delta).toFixed(1)));
      onBandChange(idx, next);
    },
    [bands, onBandChange]
  );

  // ✅ now safe to exit early
  if (!isOpen) return null;

  // --- UI Handlers
  const handleSetPreset = (preset) => {
    setSelectedPresetName(preset.name);
    if (onSetPreset) onSetPreset(preset);
  };

  const stop = (e) => e.stopPropagation();

  // --- RENDER
  return (
    <div className="eqmodal-overlay" onClick={onClose} aria-hidden={false} style={{ display: isOpen ? 'flex' : 'none' }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Custom Equalizer"
        className="modal-content eqmodal"
        onClick={stop}
      >
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">Custom Equalizer</h2>
          <div className="modal-actions">
            {modifiedCount > 0 && (
              <div className="eq-modified-summary" title={`Modified bands: ${modifiedCount}`}>
                <span className="eq-modified-count">{modifiedCount} modified</span>

              </div>
            )}

            {onSavePreset && (
              <button
                className="eq-action-btn"
                onClick={() => {
                  const defaultName = `Preset ${Date.now()}`;
                  onSavePreset(defaultName);
                }}
                title="Save preset"
              >
                Save
              </button>
            )}
            <button className="modal-close" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="settings-content">
          {presets.length > 0 && (
            <div className="eq-presets">
              <div className="eq-presets-label">Presets</div>
              <div className="eq-presets-list">
                {presets.map((p) => (
                  <button
                    key={p.name}
                    className={`eq-preset-btn ${selectedPresetName === p.name ? 'selected' : ''}`}
                    title={p.name}
                    onClick={() => handleSetPreset(p)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Band sliders */}
          <div className="eq-bands-grid" role="group" aria-label="Equalizer bands">
            {bands.map((band, idx) => (
              <div key={band.freq || idx} className={`eq-band ${Math.abs(band.gain) > 0.05 ? 'modified' : ''}`}>
                <div className="eq-band-top">
                  <button
                    className="eq-fine-btn"
                    onClick={() => handleFineChange(idx, -0.1)}
                    aria-label={`Decrease ${band.label}`}
                    title="-0.1 dB"
                  >
                    −
                  </button>

                  <input
                    type="range"
                    min={-12}
                    max={12}
                    step={0.1}
                    value={band.gain}
                    onChange={(e) => onBandChange(idx, parseFloat(e.target.value))}
                    aria-label={`${band.label} ${band.freq}Hz`}
                    className="eq-slider"
                  />

                  <button
                    className="eq-fine-btn"
                    onClick={() => handleFineChange(idx, +0.1)}
                    aria-label={`Increase ${band.label}`}
                    title="+0.1 dB"
                  >
                    +
                  </button>
                </div>

                {/* Tooltip for modified bands */}
                {Math.abs(band.gain) > 0.05 && (
                  <div className={`eq-band-tooltip ${band.gain > 0 ? 'positive' : 'negative'}`} aria-hidden="true">
                    {(band.gain > 0 ? '+' : '') + band.gain.toFixed(1)} dB
                  </div>
                )}

                <div className="eq-band-meta">
                  <div className="eq-band-label">{band.label}</div>
                  <div className="eq-band-gain">{band.gain.toFixed(1)} dB</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EQModal;
