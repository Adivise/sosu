/**
 * Widget page client-side script
 * Exported as a function to be inlined into the HTML template
 */

export function getWidgetsScript() {
  return `// Cooldown management
    const cooldowns = new Map();
    const COOLDOWN_TIME = 60000; // 60 seconds

    function setCooldown(buttonId, duration = COOLDOWN_TIME) {
      const btn = document.getElementById(buttonId);
      if (!btn) return;
      
      const endTime = Date.now() + duration;
      cooldowns.set(buttonId, endTime);
      btn.disabled = true;
      
      const updateCooldown = () => {
        const remaining = Math.ceil((cooldowns.get(buttonId) - Date.now()) / 1000);
        if (remaining <= 0) {
          cooldowns.delete(buttonId);
          btn.disabled = false;
          btn.textContent = btn.dataset.originalText || btn.textContent;
          return;
        }
        const originalText = btn.dataset.originalText || btn.textContent;
        if (!btn.dataset.originalText) {
          btn.dataset.originalText = btn.textContent;
        }
        btn.textContent = \`\${originalText} (\${remaining}s)\`;
        setTimeout(updateCooldown, 1000);
      };
      updateCooldown();
    }

    function isOnCooldown(buttonId) {
      const endTime = cooldowns.get(buttonId);
      if (!endTime) return false;
      if (Date.now() >= endTime) {
        cooldowns.delete(buttonId);
        return false;
      }
      return true;
    }

    function showToast(msg){ 
      const t=document.getElementById('toast'); 
      if(!t) return;
      t.textContent=msg; 
      t.style.display='block'; 
      setTimeout(()=>t.style.display='none', 2000); 
    }

    function switchTab(tab) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      const btn = document.querySelector('.tab[data-tab="' + tab + '"]');
      if (btn) btn.classList.add('active');

      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      const content = document.getElementById('tab-' + tab);
      if (content) content.classList.add('active');

      if (tab === 'available' && !window.availableThemesLoaded) {
        loadAvailableThemes(false);
      }
    }

    async function copyText(text, el, label = 'Copied'){
      try{
        await navigator.clipboard.writeText(text);
        showToast(\`\${label} copied\`);
        if(el && el.classList){
          el.classList.add('copied');
          const oldTitle = el.getAttribute('title') || '';
          el.setAttribute('title', \`\${label} copied\`);
          el.setAttribute('aria-live', 'polite');
          setTimeout(()=>{
            el.classList.remove('copied');
            el.setAttribute('title', oldTitle);
            el.removeAttribute('aria-live');
          }, 1200);
        }
      }catch(e){
        console.error('copyText failed', e);
        showToast('✗ Failed');
      }
    }

    async function openFolder(name){ 
      const r = await fetch('/widgets?action=open&name=' + encodeURIComponent(name)); 
      const j = await r.json(); 
      showToast(j.success ? '✓ Opened folder' : '✗ ' + (j.error||'Failed')); 
    }

    async function handleThemeInstall(name, btn, isUpdate = false) {
      const action = isUpdate ? 'Updating' : 'Downloading';
      const complete = isUpdate ? 'Updated' : 'Installed';
      const btnLabel = isUpdate ? 'Update' : 'Download';
      
      if(btn) {
        btn.disabled = true;
        btn.textContent = action + '...';
      }
      showToast(\`⏳ \${action} \${name}...\`);
      
      const r = await fetch('/widgets?action=download&name=' + encodeURIComponent(name) + '&t=' + Date.now()); 
      const j = await r.json(); 
      
      if(btn) {
        btn.disabled = false;
        btn.textContent = btnLabel;
      }
      
      showToast(j.success ? \`✓ \${complete}\` : '✗ ' + (j.error||'Failed')); 
      
      if(j.success) {
        setTimeout(()=>location.reload(), 1000);
      }
    }

    function downloadTheme(name, btn) {
      return handleThemeInstall(name, btn, false);
    }

    function updateTheme(name, btn) {
      return handleThemeInstall(name, btn, true);
    }

    async function deleteTheme(name){ 
      if(!confirm('Delete theme "' + name + '"?')) return; 
      const r = await fetch('/widgets?action=delete&name=' + encodeURIComponent(name)); 
      const j = await r.json(); 
      showToast(j.success ? '✓ Deleted' : '✗ ' + (j.error||'Failed')); 
      if(j.success) setTimeout(()=>location.reload(), 800); 
    }

    async function checkThemeUpdates(forceCheck = false) {
      const btn = document.getElementById('check-updates-btn');
      const statusEl = document.getElementById('check-updates-status');
      
      // Check cooldown
      if (!forceCheck && btn && isOnCooldown('check-updates-btn')) {
        showToast('⏳ Please wait before checking again');
        return;
      }
      
      if (btn && btn.disabled && !forceCheck) return;

      if (btn) {
        btn.disabled = true;
        btn.dataset.oldText = btn.textContent;
        btn.textContent = 'Checking...';
        btn.setAttribute('aria-busy', 'true');
      }
      if (statusEl) statusEl.textContent = 'Checking for updates...';
      if (!forceCheck) showToast('🔄 Checking for updates...');
      
      try {
        const r = await fetch('/widgets?api=github&t=' + Date.now());
        const data = await r.json();
        if(data.success && data.themes) {
          const installedCards = document.querySelectorAll('.card.installed');
          let updatesFound = 0;
          installedCards.forEach(card => {
            const themeName = card.dataset.theme;
            const localVersion = card.dataset.version;
            const githubTheme = data.themes.find(t => t.name === themeName);
            if(githubTheme && githubTheme.version && localVersion !== githubTheme.version) {
              const updateBtn = document.getElementById('update-' + themeName);
              if(updateBtn) {
                updateBtn.style.display = 'inline-block';
                updateBtn.title = 'Update from v' + localVersion + ' to v' + githubTheme.version;
                updatesFound++;
              }
            }
          });
          if(updatesFound > 0) {
            if (statusEl) statusEl.textContent = \`✨ \${updatesFound} update\${updatesFound > 1 ? 's' : ''} available\`;
            if (!forceCheck) showToast(\`✨ Found \${updatesFound} update\${updatesFound > 1 ? 's' : ''} available!\`);
          } else {
            if (statusEl) statusEl.textContent = '✓ All themes are up to date';
            if (!forceCheck) showToast('✓ All themes are up to date');
          }
        } else {
          const errMsg = data.error || 'Unknown error';
          if (statusEl) statusEl.textContent = '✗ Failed: ' + errMsg;
          if (!forceCheck) showToast('✗ Failed: ' + errMsg);
        }
      } catch(err) {
        console.error('Failed to check theme updates:', err);
        if (statusEl) statusEl.textContent = '✗ Failed to check updates';
        if (!forceCheck) showToast('✗ Failed to check updates');
      } finally {
        if (btn) {
          btn.textContent = btn.dataset.oldText || '🔄 Check for Update';
          btn.removeAttribute('aria-busy');
          delete btn.dataset.oldText;
          if (!forceCheck) {
            setCooldown('check-updates-btn');
          } else {
            btn.disabled = false;
          }
        }
        // Don't clear status - keep it visible for users to see
      }
    }

    function showErrorMessage(container, err) {
      const resetMatch = err.match(/reset=([^\\)\\s]+)/);
      let extra = '';
      if (resetMatch) {
        const resetDate = new Date(resetMatch[1]);
        if (!isNaN(resetDate)) {
          extra = \`<div class="error-info">Rate limit resets at \${resetDate.toLocaleString()}</div>\`;
        }
      }
      container.innerHTML = \`<div class="loading">✗ Failed to load themes: \${err}\${extra}<div class="error-tip">Tip: Authenticated requests have higher rate limits.</div></div>\`;
    }

    function createThemeCard(theme) {
      const card = document.createElement('div');
      card.className = 'card available';
      card.innerHTML = \`
        <div class="card-head">
          <div class="title">\${theme.name}</div>
          <div class="actions">
            <button class="btn primary" onclick="downloadTheme('\${theme.name}', this)">Download</button>
            <button class="btn" onclick="window.open('https://github.com/Adivise/sosu-widgets/tree/main/widgets/\${theme.name}', '_blank')">View on GitHub</button>
          </div>
        </div>
        <div class="preview">
          <div class="preview-placeholder" data-theme="\${theme.name}">
            <button class="btn btn-preview" onclick="previewTheme('\${theme.name}', this)">Preview</button>
          </div>
        </div>
        <div class="meta">
          <span>Download to use this widget in OBS</span>
        </div>
      \`;
      return card;
    }

    async function loadAvailableThemes(clearCache = false) {
      const container = document.getElementById('available-themes');
      if (!container.querySelector('.grid')) {
        container.innerHTML = '';
      }
      try {
        const cacheParam = clearCache ? '&cache=clear&t=' + Date.now() : '&t=' + Date.now();
        const r = await fetch('/widgets?api=github' + cacheParam);
        const data = await r.json();
        if (!data.success) {
          showErrorMessage(container, data.error || 'Unknown error');
          window.availableThemesLoaded = true;
          return;
        }
        if(!data.themes || data.themes.length === 0) {
          container.innerHTML = '<div class="loading">No themes available</div>';
          window.availableThemesLoaded = true;
          return;
        }
        const availableThemes = data.themes.filter(t => !installedThemes.includes(t.name));
        if(availableThemes.length === 0) {
          container.innerHTML = '<div class="loading">All available themes are already installed ✓</div>';
          window.availableThemesLoaded = true;
          return;
        }
        const grid = document.createElement('div');
        grid.className = 'grid';
        availableThemes.forEach(theme => grid.appendChild(createThemeCard(theme)));
        container.innerHTML = '';
        container.appendChild(grid);
        window.availableThemesLoaded = true;
      } catch(err) {
        container.innerHTML = '<div class="loading">✗ Failed to load themes: ' + err.message + '</div>';
      }
    }

    function createPreviewIframe(themeName, container) {
      if (!container) return;
      if (container.querySelector('iframe')) return;
      const iframe = document.createElement('iframe');
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('src', '/preview?theme=' + encodeURIComponent(themeName));
      iframe.setAttribute('frameborder', '0');
      iframe.style.width = '500px';
      iframe.style.height = '200px';
      iframe.style.background = 'transparent';
      iframe.style.borderRadius = '8px';
      container.innerHTML = '';
      container.appendChild(iframe);
    }

    function previewTheme(name, btn) {
      try {
        console.log('[Widget] Preview requested for', name);
        const card = btn ? btn.closest('.card') : null;
        const placeholder = card ? card.querySelector('.preview-placeholder') : document.querySelector('.preview-placeholder[data-theme="' + name + '"]');
        if (!placeholder) {
          console.warn('[Widget] Preview placeholder not found for', name);
          return;
        }
        createPreviewIframe(name, placeholder);
      } catch (e) {
        console.error('[Widget] previewTheme error', e);
      }
    }

    async function refreshThemes() {
      const btn = document.getElementById('refresh-btn');
      const statusEl = document.getElementById('refresh-status');
      if (!btn) return;
      
      // Check cooldown
      if (isOnCooldown('refresh-btn')) {
        showToast('⏳ Please wait before refreshing again');
        return;
      }
      
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = '🔄 Refreshing...';
      if (statusEl) statusEl.textContent = 'Fetching latest themes from GitHub...';
      
      try {
        showToast('🔄 Clearing cache and fetching fresh data...');
        
        // Clear cache and reload available themes
        window.availableThemesLoaded = false;
        await loadAvailableThemes(true);
        
        if (statusEl) statusEl.textContent = '✓ Successfully refreshed with latest data';
        showToast('✓ Successfully refreshed with latest data!');
      } catch (err) {
        console.error('Failed to refresh themes:', err);
        if (statusEl) statusEl.textContent = '✗ Failed to refresh: ' + (err.message || 'Unknown error');
        showToast('✗ Failed to refresh: ' + (err.message || 'Unknown error'));
        btn.disabled = false;
        btn.textContent = originalText;
      } finally {
          btn.textContent = originalText;
        setCooldown('refresh-btn');
      }
    }

    window.refreshThemes = refreshThemes;
    
    // Auto-check for updates every 5 minutes in realtime
    try { 
      checkThemeUpdates(true); // Initial check (no toast/cooldown)
      setInterval(() => checkThemeUpdates(true), 300000); // Check every 5 minutes
    } catch(e) { 
      console.error('Auto-update check error:', e);
    }`;
}
