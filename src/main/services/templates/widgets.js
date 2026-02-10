/**
 * Widget themes management template
 * Exported as a function that returns HTML with substituted variables
 * Script is imported from widgetsScript.js and inlined into HTML
 */

import { getWidgetsScript } from './widgetsScript.js';

export function getWidgetsTemplate(installedCards, base, installedThemes, dateNow) {
  const widgetsScript = getWidgetsScript();
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>sosu - widget themes</title>
  <link rel="stylesheet" href="/widgets.css?v=${dateNow}" />
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div class="header-left">
        <h1>Widget Themes</h1>
        <div class="subtitle">Download, preview, and manage your OBS widget themes</div>
      </div>
      <div class="header-right">
        <button class="btn primary" onclick="window.open('https://github.com/Adivise/sosu-widgets', '_blank')">Browse on GitHub</button>
      </div>
    </div>

    <div class="tabs">
      <button class="tab active" data-tab="installed" onclick="switchTab('installed')">📦 Installed Themes</button>
      <button class="tab" data-tab="available" onclick="switchTab('available')">🌐 Available Themes</button>
    </div>

    <div id="tab-installed" class="tab-content active">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px;">
        <div id="check-updates-status" style="color:#8b95a8;font-size:14px;"></div>
        <div><button id="check-updates-btn" class="btn" onclick="checkThemeUpdates()">🔄 Check for Update</button></div>
      </div>
      <div class="grid" id="installed-themes">${installedCards}</div>
    </div>

    <div id="tab-available" class="tab-content">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px;">
        <div id="refresh-status" style="color:#8b95a8;font-size:14px;"></div>
        <div><button id="refresh-btn" class="btn" onclick="refreshThemes()">🔄 Refresh</button></div>
      </div>
      <div id="available-themes" class="loading"></div>
    </div>

  </div>

  <div id="toast" class="toast">Copied!</div>

  <script>
    const base = '${base}';
    const installedThemes = ${JSON.stringify(installedThemes)};

    ${widgetsScript}
  </script>
</body>
</html>`;
}
