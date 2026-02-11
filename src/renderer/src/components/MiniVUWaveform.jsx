import { useRef, useEffect } from 'react';
import './MiniVUWaveform.css';

const MiniVUWaveform = ({ analyser = null, active = false, height = 12 }) => {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const bufRef = useRef(null);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(2, Math.floor(rect.width * dpr));
      canvas.height = Math.max(2, Math.floor(rect.height * dpr));
      // Use setTransform to avoid accumulating scale transforms
      try { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); } catch (e) {}
    };

    resize();
    const onResize = () => resize();
    window.addEventListener('resize', onResize);

    // Use time-domain data for smooth waveform visualization
    const bufLen = analyser.fftSize || 1024;
    if (!bufRef.current || bufRef.current.length !== bufLen) bufRef.current = new Uint8Array(bufLen);

    // read tuning options from CSS variables when available
    const cssGet = (name, fallback) => {
      try { const val = getComputedStyle(document.documentElement).getPropertyValue(name); return val ? parseFloat(val) : fallback; } catch (e) { return fallback; }
    };
    const amplitude = cssGet('--vu-amplitude', 0.95);
    const lineWidth = cssGet('--vu-line-width', 2);

    const draw = () => {
      try {
        analyser.getByteTimeDomainData(bufRef.current);
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;

        // compute RMS for subtle dynamics
        let sum = 0;
        for (let i = 0; i < bufRef.current.length; i++) {
          const v = (bufRef.current[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / bufRef.current.length);

        // clear
        ctx.clearRect(0, 0, w, h);

        // subtle background
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        ctx.fillRect(0, 0, w, h);

        // accent color
        let accent = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
        if (!accent) accent = '#1db954';

        // prepare points for smooth curve
        const points = [];
        const sampleCount = Math.min(bufRef.current.length, Math.max(64, Math.floor(w / 2)));
        const step = Math.max(1, Math.floor(bufRef.current.length / sampleCount));
        const midY = h / 2;
        for (let i = 0, x = 0; i < bufRef.current.length && x < w; i += step, x += Math.ceil(w / sampleCount)) {
          const v = (bufRef.current[i] - 128) / 128; // -1..1
          const y = midY - v * (h / 2) * amplitude;
          points.push({ x: Math.min(x, w), y });
        }

        // smooth stroke using quadratic curves
        if (points.length > 1) {
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.lineWidth = Math.max(1, lineWidth);

          // glow based on RMS
          const glow = Math.max(2, Math.round(rms * 40));
          ctx.shadowBlur = Math.min(40, glow);
          ctx.shadowColor = accent;

          // primary stroke
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const cx = (prev.x + curr.x) / 2;
            const cy = (prev.y + curr.y) / 2;
            ctx.quadraticCurveTo(prev.x, prev.y, cx, cy);
          }
          ctx.strokeStyle = accent;
          ctx.stroke();

          // fill under curve
          const grad = ctx.createLinearGradient(0, 0, 0, h);
          grad.addColorStop(0, `${accent}`);
          grad.addColorStop(1, 'rgba(255,255,255,0.03)');

          ctx.lineTo(w, h);
          ctx.lineTo(0, h);
          ctx.closePath();
          ctx.fillStyle = grad;
          ctx.globalAlpha = Math.min(1, 0.7 + rms * 0.6);
          ctx.fill();
          ctx.globalAlpha = 1;

          // highlight stroke for crispness
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = 'rgba(255,255,255,0.12)';
          ctx.lineWidth = Math.max(1, Math.floor(lineWidth / 1.5));
          ctx.stroke();
          ctx.restore();

          // subtle pulsing top bar to emphasize beats
          if (rms > 0.02) {
            ctx.fillStyle = `rgba(255,255,255,${Math.min(0.18, rms * 0.5)})`;
            ctx.fillRect(0, 0, Math.min(w, Math.round(w * (rms * 3))), 2);
          }
        }
      } catch (e) {
        // ignore drawing errors
      }
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', onResize);
      try { if (rafRef.current) cancelAnimationFrame(rafRef.current); } catch (e) {}
    };
  }, [analyser]);

  return (
    <div className={`mini-vu-wave ${active ? 'active' : 'inactive'}`}>
      <canvas ref={canvasRef} style={{ width: '100%', height: `${height}px`, display: 'block' }} />
    </div>
  );
};

export default MiniVUWaveform;
