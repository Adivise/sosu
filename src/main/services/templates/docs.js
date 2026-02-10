/**
 * Widget API documentation template
 * Exported as a function that returns HTML with substituted variables
 */

export function getDocsTemplate(port) {
  const exampleJson = JSON.stringify({
    title: "Song Title",
    artist: "Artist Name",
    album: "Album Name",
    duration: 180.0,
    currentTime: 45.5,
    imageFile: "/path/to/image.jpg",
    paused: false
  }, null, 2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>sosu - widget api</title>
  <link rel="stylesheet" href="/docs.css">
</head>
<body>
  <div class="header">
    <div class="container">
      <h1 class="title">Widget API</h1>
      <p class="subtitle">Real-time now-playing data for OBS, StreamLabs, and custom integrations</p>
    </div>
  </div>

  <div class="content">
    <div class="section">
      <h2 class="section-title"><span class="icon">🚀</span> Quick Start</h2>
      <p style="color: var(--muted); margin-bottom: 16px;">
        Add a Browser Source to OBS with one of these URLs. Server must be running (port ${port}).
      </p>
      <div class="code-block">
        <button class="copy-btn" onclick="copy('http://localhost:${port}/widget?theme=default', this)">Copy</button>
        http://localhost:${port}/widget?theme=default
      </div>
      <p style="color: var(--muted); margin-top: 12px; font-size: 14px;">
        Browse and download more themes at <a href="/widgets">/widgets</a>
      </p>
    </div>

    <div class="section">
      <h2 class="section-title"><span class="icon">📡</span> HTTP Endpoints</h2>
      
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="endpoint-path">/json</span>
        </div>
        <p class="endpoint-desc">Get current song data as JSON</p>
        <div class="code-block">
          <button class="copy-btn" onclick="copy('http://localhost:${port}/json', this)">Copy</button>
          http://localhost:${port}/json
        </div>
      </div>

      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="endpoint-path">/widget</span>
          <span class="badge">?theme=NAME</span>
        </div>
        <p class="endpoint-desc">Display widget overlay for OBS (specify theme parameter)</p>
        <div class="code-block">
          <button class="copy-btn" onclick="copy('http://localhost:${port}/widget?theme=minimal', this)">Copy</button>
          http://localhost:${port}/widget?theme=minimal
        </div>
      </div>

      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="endpoint-path">/image</span>
        </div>
        <p class="endpoint-desc">Get current song's album art image</p>
        <div class="code-block">
          <button class="copy-btn" onclick="copy('http://localhost:${port}/image', this)">Copy</button>
          http://localhost:${port}/image
        </div>
      </div>

      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="endpoint-path">/widgets</span>
        </div>
        <p class="endpoint-desc">Browse, preview, and download widget themes</p>
        <div class="code-block">
          <button class="copy-btn" onclick="copy('http://localhost:${port}/widgets', this)">Copy</button>
          http://localhost:${port}/widgets
        </div>
      </div>

      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="endpoint-path">/status</span>
        </div>
        <p class="endpoint-desc">Check server status and uptime</p>
        <div class="code-block">
          <button class="copy-btn" onclick="copy('http://localhost:${port}/status', this)">Copy</button>
          http://localhost:${port}/status
        </div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title"><span class="icon">⚡</span> WebSocket Protocol</h2>
      <p style="color: var(--muted); margin-bottom: 16px;">
        Connect via WebSocket for real-time updates. Data is pushed ~every second while music plays.
      </p>
      
      <div class="ws-info">
        <div class="info-card">
          <div class="info-label">WebSocket URL</div>
          <div class="info-value">ws://localhost:${port}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Protocol</div>
          <div class="info-value">JSON messages</div>
        </div>
        <div class="info-card">
          <div class="info-label">Update Rate</div>
          <div class="info-value">~1 message/sec</div>
        </div>
      </div>

      <p style="color: var(--muted); margin: 16px 0 12px; font-weight: 600;">Example Message:</p>
      <div class="code-block" style="padding-right: 60px;">
        <button class="copy-btn" onclick="copy(exampleJson, this)">Copy</button>
        <pre style="margin:0; white-space: pre-wrap;">${exampleJson}<\/pre>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title"><span class="icon">🎨</span> Creating Custom Themes</h2>
      <p style="color: var(--muted); margin-bottom: 12px;">
        Build your own widget themes! Check the developer guide:
      </p>
      <div class="code-block">
        <button class="copy-btn" onclick="copy('https://github.com/Adivise/sosu-widgets', this)">Copy</button>
        https://github.com/Adivise/sosu-widgets
      </div>
    </div>
  </div>

  <script>
    const exampleJson = \`${exampleJson}\`;

    function copy(text, btn) {
      navigator.clipboard.writeText(text).then(() => {
        if (!btn) return;
        const orig = btn.textContent;
        btn.textContent = '✓ Copied!';
        btn.style.background = 'rgba(63, 185, 80, 0.3)';
        btn.style.borderColor = '#3fb950';
        btn.style.color = '#3fb950';
        setTimeout(() => {
          btn.textContent = orig;
          btn.style.background = '';
          btn.style.borderColor = '';
          btn.style.color = '';
        }, 2000);
      });
    }
  <\/script>
</body>
</html>`;
}
