/**
 * Widget API documentation CSS stylesheet
 * Exported as a string for dynamic loading
 */

export const docsCSS = `* { margin: 0; padding: 0; box-sizing: border-box; }
:root {
  --bg: #0a0e14;
  --card: #151a21;
  --border: rgba(255,255,255,0.08);
  --text: #e6edf3;
  --muted: #8b949e;
  --accent: #58a6ff;
  --accent-hover: #79c0ff;
  --success: #3fb950;
  --purple: #bc8cff;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  padding: 0;
  margin: 0;
}
.header {
  background: linear-gradient(135deg, rgba(88, 166, 255, 0.1), rgba(188, 140, 255, 0.1));
  border-bottom: 1px solid var(--border);
  padding: 32px 24px;
}
.container {
  max-width: 1100px;
  margin: 0 auto;
}
.title {
  font-size: 32px;
  font-weight: 800;
  margin-bottom: 8px;
  background: linear-gradient(135deg, var(--accent), var(--purple));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.subtitle {
  color: var(--muted);
  font-size: 16px;
}
.content {
  padding: 32px 24px;
  max-width: 1100px;
  margin: 0 auto;
}
.section {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
}
.section-title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.icon {
  font-size: 24px;
}
.endpoint {
  background: rgba(0,0,0,0.3);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  transition: all 0.2s;
}
.endpoint:hover {
  border-color: var(--accent);
  transform: translateX(4px);
}
.endpoint-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.method {
  padding: 4px 10px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.method.get { background: rgba(63, 185, 80, 0.2); color: var(--success); border: 1px solid var(--success); }
.endpoint-path {
  font-family: 'Consolas', monospace;
  font-size: 16px;
  font-weight: 600;
  color: var(--accent);
}
.endpoint-desc {
  color: var(--muted);
  font-size: 14px;
  margin-bottom: 12px;
}
.code-block {
  background: rgba(0,0,0,0.4);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 16px;
  font-family: 'Consolas', monospace;
  font-size: 13px;
  color: var(--text);
  overflow-x: auto;
  position: relative;
}
.copy-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(88, 166, 255, 0.2);
  border: 1px solid var(--accent);
  color: var(--accent);
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s;
}
.copy-btn:hover {
  background: var(--accent);
  color: #000;
}
.ws-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin-top: 16px;
}
.info-card {
  background: rgba(0,0,0,0.3);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
}
.info-label {
  font-size: 12px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 700;
  margin-bottom: 8px;
}
.info-value {
  font-family: 'Consolas', monospace;
  color: var(--accent);
  font-size: 14px;
  font-weight: 600;
}
.badge {
  display: inline-block;
  padding: 4px 10px;
  background: rgba(188, 140, 255, 0.2);
  border: 1px solid var(--purple);
  color: var(--purple);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  margin-left: 8px;
}
a {
  color: var(--accent);
  text-decoration: none;
  font-weight: 600;
}
a:hover {
  color: var(--accent-hover);
  text-decoration: underline;
}
`;
