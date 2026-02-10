/**
 * Widget themes CSS stylesheet
 * Exported as a string for dynamic loading
 */

export const widgetsCSS = `* { margin: 0; padding: 0; box-sizing: border-box; }
body { 
  margin: 0; 
  background: linear-gradient(135deg, #0a0e17 0%, #1a1f2e 100%);
  color: #e8edf4; 
  font-family: 'Segoe UI', Tahoma, sans-serif; 
  min-height: 100vh;
}
.wrap { 
  max-width: 1200px; 
  margin: 0 auto; 
  padding: 32px 24px; 
}
.header {
  margin-bottom: 32px;
  padding-bottom: 20px;
  border-bottom: 2px solid rgba(255,255,255,0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.header-left h1 { 
  font-size: 32px; 
  font-weight: 800;
  margin-bottom: 8px;
  background: linear-gradient(135deg, #fff 0%, #a8b8d8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.subtitle {
  font-size: 15px;
  color: #8b95a8;
  font-weight: 400;
}
.header-right {
  display: flex;
  gap: 12px;
  align-items: center;
}
.tabs {
  display: flex;
  gap: 8px;
  margin: 32px 0 24px;
  border-bottom: 2px solid rgba(255,255,255,0.08);
  padding-bottom: 0;
}
.tab {
  padding: 12px 24px;
  background: transparent;
  border: none;
  color: #8b95a8;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 3px solid transparent;
  margin-bottom: -2px;
}
.tab:hover {
  color: #d4e0f5;
  background: rgba(255,255,255,0.05);
}
.tab.active {
  color: #fff;
  border-bottom-color: #667eea;
}
.tab-content {
  display: none;
}
.tab-content.active {
  display: block;
}
.section-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 20px;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 12px;
}
.badge {
  display: inline-block;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 4px;
  background: rgba(102, 126, 234, 0.2);
  color: #8bb3ff;
  margin-left: 8px;
}
.grid { 
  display: grid; 
  grid-template-columns: 1fr; 
  gap: 24px; 
}
@media (min-width: 1100px) { 
  .grid { grid-template-columns: repeat(auto-fit, minmax(850px, 1fr)); } 
}
.card { 
  background: rgba(20, 26, 34, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.08); 
  border-radius: 16px; 
  box-shadow: 0 12px 32px rgba(0,0,0,0.4);
  transition: all 0.3s ease;
  overflow: hidden;
}
.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 48px rgba(0,0,0,0.5);
  border-color: rgba(255,255,255,0.12);
}
.card-head { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  padding: 16px 20px;
  background: rgba(255,255,255,0.02);
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.title { 
  font-weight: 700; 
  font-size: 18px;
  color: #fff;
  letter-spacing: 0.2px;
  display: flex;
  align-items: center;
}
.actions { 
  display: flex; 
  gap: 8px; 
  flex-wrap: wrap;
}
.btn { 
  background: linear-gradient(135deg, #1e2936 0%, #2a3544 100%);
  border: 1px solid rgba(255,255,255,0.1); 
  color: #d4e0f5; 
  padding: 8px 14px; 
  border-radius: 8px; 
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}
.btn:hover { 
  background: linear-gradient(135deg, #2a3544 0%, #353f52 100%);
  border-color: rgba(255,255,255,0.18);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.btn:active {
  transform: translateY(0);
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: rgba(102, 126, 234, 0.3);
  color: #fff;
}
.btn.primary:hover {
  background: linear-gradient(135deg, #7c8ef5 0%, #8a5db8 100%);
  border-color: rgba(102, 126, 234, 0.5);
}
.btn.danger { 
  background: linear-gradient(135deg, #3a1e22 0%, #4a2428 100%);
  border-color: rgba(255,77,77,0.3); 
  color: #ffcdd2; 
}
.btn.danger:hover { 
  background: linear-gradient(135deg, #4a2428 0%, #5a2a2e 100%);
  border-color: rgba(255,77,77,0.5);
}
.preview { 
  padding: 20px;
  background: rgba(0,0,0,0.2);
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 280px;
}
.preview iframe { 
  width: 100%;
  max-width: none;
  min-width: 750px;
  height: 350px;
  background: transparent;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}
.card.available .preview iframe {
  width: 500px !important;
  max-width: 500px !important;
  min-width: 500px !important;
  height: 200px !important;
  max-height: 200px !important;
  min-height: 200px !important;
}
.preview-placeholder {
  color: #8b95a8;
  font-size: 15px;
  text-align: center;
  position: relative;
}
.preview-placeholder .preview-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.preview-placeholder .preview-overlay .btn {
  pointer-events: auto;
  padding: 10px 16px;
}
.preview-placeholder.has-iframe .preview-overlay { display: none; }
.meta { 
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  padding: 16px 20px;
  font-size: 13px; 
  background: rgba(0,0,0,0.15);
}
.meta > span {
  display: flex;
  align-items: center;
  gap: 6px;
}
.meta-label {
  color: #8b95a8;
  font-weight: 600;
}
.meta-value {
  color: #d4e0f5;
}
.url { 
  grid-column: 1 / -1;
  background: rgba(14, 19, 25, 0.6);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px; 
  padding: 10px 12px;
  font-family: 'Consolas', monospace;
  font-size: 13px;
  color: #a8d4ff;
  word-break: break-all;
}
.author a {
  color: #6ba3ff;
  text-decoration: none;
  transition: color 0.2s;
}
.author a:hover {
  color: #8bb9ff;
  text-decoration: underline;
}
.toast { 
  position: fixed; 
  right: 24px; 
  bottom: 22px; 
  background: linear-gradient(135deg, #1e2936 0%, #2a3544 100%);
  color: #dff1ff; 
  padding: 12px 20px; 
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 12px; 
  display: none;
  font-weight: 600;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  animation: slideIn 0.3s ease;
  z-index: 1000;
}
.copied { 
  background: rgba(102,126,234,0.12);
  border-radius: 6px;
  padding: 2px 6px;
  transition: background 0.18s ease, transform 0.12s ease;
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(102,126,234,0.08);
}
.copyable {
  cursor: pointer;
  display: inline-block;
  position: relative;
  padding: 4px 8px;
  border-radius: 8px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.04);
  color: #d4e0f5;
  font-weight: 700;
  transition: background 0.12s ease, box-shadow 0.12s ease, transform 0.08s ease, border-color 0.12s ease;
}
.copyable:hover, .copyable:focus {
  background: rgba(255,255,255,0.10);
  box-shadow: 0 8px 24px rgba(0,0,0,0.45), 0 6px 16px rgba(102,126,234,0.06);
  outline: 3px solid rgba(102,126,234,0.12);
  transform: translateY(-2px);
}
.copyable.copied {
  background: rgba(102,126,234,0.28);
  border-color: rgba(102,126,234,0.5);
  color: #fff;
  box-shadow: 0 10px 30px rgba(102,126,234,0.18);
  transform: translateY(-1px);
}
@keyframes slideIn {
  from { transform: translateX(120%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

/* Error message styles */
.error-info {
  margin-top: 8px;
  color: #9aa1b3;
  font-size: 13px;
}

.error-tip {
  margin-top: 6px;
  color: #8b95a8;
  font-size: 13px;
}

/* Preview placeholder */
.preview-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(10, 14, 23, 0.6) 0%, rgba(20, 26, 34, 0.4) 100%);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  position: relative;
  overflow: hidden;
}

/* Preview button in center */
.btn-preview {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 32px;
  font-size: 15px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: 1px solid rgba(102, 126, 234, 0.4);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.25), 0 2px 8px rgba(0,0,0,0.3);
  letter-spacing: 0.3px;
  text-shadow: 0 1px 3px rgba(0,0,0,0.4);
  z-index: 10;
  position: relative;
}

.btn-preview::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 10px;
  padding: 1px;
  background: linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05));
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.25s;
}

.btn-preview:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4), 0 4px 12px rgba(0,0,0,0.4);
  background: linear-gradient(135deg, #7c8ef5 0%, #8a5db8 100%);
  border-color: rgba(102, 126, 234, 0.6);
}

.btn-preview:hover::before {
  opacity: 1;
}

.btn-preview:active {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3), 0 2px 8px rgba(0,0,0,0.3);
}
`;
