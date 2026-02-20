import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './src/index.css';
import BeatmapViewer from './src/components/BeatmapViewer.jsx';

function BeatmapPlayerWindow() {
  const [beatmapData, setBeatmapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Track whether a live theme update arrived so it can win over stale userData
  const hasThemeFromIpcRef = useRef(false);

  // Preview readiness / asset load status (BeatmapViewer reports via callbacks)
  const [previewReady, setPreviewReady] = useState(false);
  const [assetStatus, setAssetStatus] = useState({ objects: false, audio: false, background: false });

  // Debug visibility and robust fallback: if BeatmapViewer reports assets ready but previewReady wasn't set, auto-fix
  useEffect(() => { console.log('[BeatmapPlayerWindow] previewReady state =', previewReady); }, [previewReady]);
  useEffect(() => { console.log('[BeatmapPlayerWindow] assetStatus =', assetStatus); }, [assetStatus]);
  const allAssetsReady = assetStatus.objects && assetStatus.audio && assetStatus.background;
  useEffect(() => {
    if (allAssetsReady && !previewReady) {
      console.warn('[BeatmapPlayerWindow] all assets reported ready but previewReady is false — forcing previewReady = true');
      setPreviewReady(true);
    }
  }, [allAssetsReady, previewReady]);

  useEffect(() => {
    console.log('[BeatmapPlayerWindow] Initializing...');

    // Global runtime error overlay + handlers so errors are visible even when DevTools disconnects
    const overlayId = 'beatmap-player-runtime-error';
    function showOverlay(msg) {
      let el = document.getElementById(overlayId);
      if (!el) {
        el = document.createElement('div');
        el.id = overlayId;
        Object.assign(el.style, {
          position: 'fixed',
          right: '12px',
          bottom: '12px',
          zIndex: 99999,
          background: 'rgba(220,60,60,0.92)',
          color: '#fff',
          padding: '10px 12px',
          borderRadius: '8px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
          fontSize: '12px',
          maxWidth: '420px',
          whiteSpace: 'pre-wrap',
          fontFamily: 'monospace',
        });
        document.body.appendChild(el);
      }
      el.textContent = msg;
    }
    function hideOverlay() {
      const el = document.getElementById(overlayId);
      if (el) el.remove();
    }

    const onError = (ev) => {
      const msg = ev?.message || String(ev);
      console.error('[BeatmapPlayerWindow] Uncaught error:', ev);
      showOverlay('Uncaught error: ' + msg);
    };
    const onRejection = (ev) => {
      const reason = ev?.reason || ev;
      console.error('[BeatmapPlayerWindow] Unhandled promise rejection:', reason);
      showOverlay('Unhandled rejection: ' + (reason?.message || String(reason)));
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);

    // cleanup for handlers/overlay on unmount
    const cleanupOverlayHandlers = () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      hideOverlay();
    };

    // Get beatmap data from window opener or IPC
    const loadBeatmap = async () => {
      try {
        console.log('[BeatmapPlayerWindow] Loading beatmap data...');
        
        // Listen for beatmap data from main process
        if (window.electronAPI?.onBeatmapData) {
          window.electronAPI.onBeatmapData((data) => {
            console.log('[BeatmapPlayerWindow] Received beatmap data via event');
            if (data) {
              console.log('[BeatmapPlayerWindow] Metadata:', data.metadata?.title);
              setBeatmapData(data);
              setLoading(false);
            }
          });
        }

        // Apply current theme from main renderer (initial) and listen for updates
        try {
          // 1) Prefer the last live theme that the main window broadcast
          //    (stored in the main process) so new preview windows always
          //    pick up the current accent even if they missed the initial IPC.
          if (window.electronAPI?.getBeatmapPlayerTheme) {
            try {
              const vars = await window.electronAPI.getBeatmapPlayerTheme();
              if (vars && vars.accentColor) {
                hasThemeFromIpcRef.current = true;
                try { document.documentElement.style.setProperty('--accent-color', vars.accentColor); } catch (e) {}
                if (vars.accentHover) document.documentElement.style.setProperty('--accent-color-hover', vars.accentHover);
                if (vars.accentDark) document.documentElement.style.setProperty('--accent-color-dark', vars.accentDark);
                if (vars.accentContrast) document.documentElement.style.setProperty('--accent-contrast', vars.accentContrast);
                if (vars.accentColorRgb) document.documentElement.style.setProperty('--accent-color-rgb', vars.accentColorRgb);
              }
            } catch (e) { /* ignore */ }
          }

          // 2) Fallback: if we still don't have a live theme, use persisted userData
          if (!hasThemeFromIpcRef.current && window.electronAPI?.getUserData) {
            const ud = await window.electronAPI.getUserData();
            if (ud?.accentColor) {
              try { document.documentElement.style.setProperty('--accent-color', ud.accentColor); } catch (e) {}
              const hex = (ud.accentColor || '#1db954').replace('#','').trim();
              if (hex.length === 6) {
                const rr = parseInt(hex.slice(0,2), 16);
                const gg = parseInt(hex.slice(2,4), 16);
                const bb = parseInt(hex.slice(4,6), 16);
                try { document.documentElement.style.setProperty('--accent-color-rgb', `${rr}, ${gg}, ${bb}`); } catch (e) {}
              }
            }
          }
        } catch (e) { /* ignore */ }

        if (window.electronAPI?.onThemeUpdate) {
          window.electronAPI.onThemeUpdate((vars) => {
            try {
              hasThemeFromIpcRef.current = true;
              if (vars?.accentColor) document.documentElement.style.setProperty('--accent-color', vars.accentColor);
              if (vars?.accentHover) document.documentElement.style.setProperty('--accent-color-hover', vars.accentHover);
              if (vars?.accentDark) document.documentElement.style.setProperty('--accent-color-dark', vars.accentDark);
              if (vars?.accentContrast) document.documentElement.style.setProperty('--accent-contrast', vars.accentContrast);
              if (vars?.accentColorRgb) document.documentElement.style.setProperty('--accent-color-rgb', vars.accentColorRgb);
            } catch (err) { console.debug('apply theme failed', err); }
          });
        }

        // Request initial beatmap data
        if (window.electronAPI?.requestBeatmapData) {
          console.log('[BeatmapPlayerWindow] Requesting beatmap data...');
          const data = await window.electronAPI.requestBeatmapData();
          console.log('[BeatmapPlayerWindow] Received initial data');
          
          if (data) {
            console.log('[BeatmapPlayerWindow] Metadata:', data.metadata?.title);
            setBeatmapData(data);
            setLoading(false);
          } else {
            console.error('[BeatmapPlayerWindow] No beatmap data provided');
            setError('No beatmap data provided');
            setLoading(false);
          }
        } else {
          console.error('[BeatmapPlayerWindow] ElectronAPI not available');
          setError('ElectronAPI not available');
          setLoading(false);
        }
      } catch (err) {
        console.error('[BeatmapPlayerWindow] Error loading beatmap:', err);
        setError(err.message || 'Failed to load beatmap');
        setLoading(false);
        showOverlay('Error loading beatmap: ' + (err?.message || String(err)));
      }
    };

    loadBeatmap();

    return cleanupOverlayHandlers;
  }, []);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        color: 'white',
        fontSize: '18px',
        gap: '20px',
        backgroundColor: '#1a1a2e'
      }}>
        <div className="spinner" style={{
          border: '4px solid rgba(255, 255, 255, 0.1)',
          borderTop: '4px solid #fc6496',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          animation: 'spin 1s linear infinite'
        }}></div>
        <div>Loading beatmap...</div>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        color: '#ff4444',
        fontSize: '16px',
        padding: '40px',
        textAlign: 'center',
        backgroundColor: '#1a1a2e',
        gap: '20px'
      }}>
        <div style={{ fontSize: '48px' }}>❌</div>
        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>Failed to load beatmap</div>
        <div style={{ color: '#999', fontSize: '14px' }}>{error}</div>
        <button 
          onClick={() => window.close()}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            background: '#fc6496',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Close Window
        </button>
      </div>
    );
  }

  const handleAssetStatus = (status) => { console.log('[BeatmapPlayerWindow] onAssetStatusChange ->', status); setAssetStatus(status); };
  const handleReady = (ok) => { console.log('[BeatmapPlayerWindow] onReady received ->', ok); setPreviewReady(ok); };

  console.log('[BeatmapPlayerWindow] Rendering BeatmapViewer component');
  return (
    <div style={{ height: '100vh', position: 'relative', backgroundColor: '#0f0f17' }}>
      <BeatmapViewer beatmapData={beatmapData} onReady={handleReady} onAssetStatusChange={handleAssetStatus} />

      {/* Overlay while BeatmapViewer prepares assets/objects */}
      {!(previewReady || allAssetsReady) && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ width: 520, padding: 28, borderRadius: 14, background: 'linear-gradient(180deg, rgba(18,18,18,0.96), rgba(12,12,12,0.98))', boxShadow: '0 12px 40px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.04)', color: '#e6eefc' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div className="spinner" style={{ border: '4px solid rgba(255,255,255,0.06)', borderTop: '4px solid var(--accent-color)', borderRadius: '50%', width: 42, height: 42, animation: 'spin 1s linear infinite' }} />
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Preparing preview...</div>
                <div style={{ marginTop: 6, color: 'rgba(205,214,244,0.6)', fontSize: 13 }}>Loading assets and objects — this may take a moment for large maps.</div>
              </div>
            </div>

            <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}>
              <div style={{ color: 'rgba(205,214,244,0.85)' }}>Objects parsed</div>
              <div style={{ color: assetStatus.objects ? 'var(--accent-color)' : 'rgba(255,255,255,0.45)', fontWeight: 700 }}>{assetStatus.objects ? 'Ready' : 'Waiting'}</div>

              <div style={{ color: 'rgba(205,214,244,0.85)' }}>Audio loaded</div>
              <div style={{ color: assetStatus.audio ? 'var(--accent-color)' : 'rgba(255,255,255,0.45)', fontWeight: 700 }}>{assetStatus.audio ? 'Ready' : 'Waiting'}</div>

              <div style={{ color: 'rgba(205,214,244,0.85)' }}>Background image</div>
              <div style={{ color: assetStatus.background ? 'var(--accent-color)' : 'rgba(255,255,255,0.45)', fontWeight: 700 }}>{assetStatus.background ? 'Ready' : 'Waiting'}</div>
            </div>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => window.close()} style={{ padding: '8px 12px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', color: '#dcdcdc', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          `}} />
        </div>
      )}
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<BeatmapPlayerWindow />);

