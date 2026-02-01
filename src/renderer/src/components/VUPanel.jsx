import React, { useEffect, useState } from 'react';
import MiniVUWaveform from './MiniVUWaveform';
import './VUPanel.css';

const VUPanel = ({ defaultHeight = 18, defaultEnabled = true, mode = 'padded' }) => {
  const [analyser, setAnalyser] = useState(null);
  const [enabled, setEnabled] = useState(defaultEnabled);

  useEffect(() => {
    const handler = (e) => {
      try {
        const a = e?.detail?.analyser;
        if (a) {
          setAnalyser(a);
        }
      } catch (err) {}
    };
    window.addEventListener('sosu:analyser-ready', handler);
    // If an analyser was created before this component mounted, pick it up
    try { if (window.__sosu_lastAnalyser) setAnalyser(window.__sosu_lastAnalyser); } catch (e) {}
    return () => window.removeEventListener('sosu:analyser-ready', handler);
  }, []);

  if (!enabled) return null;

  return (
    <div className={`vupanel vupanel--${mode}`} title="Audio visualizer">
      <MiniVUWaveform analyser={analyser} height={defaultHeight} active={!!analyser} />
    </div>
  );
};

export default VUPanel;
