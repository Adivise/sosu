import { ensureDefaultTheme } from './ensureDefaultTheme.js';
import { loadTheme } from './loadTheme.js';
import { listThemes } from './listThemes.js';
import { getThemeMetadata } from './getThemeMetadata.js';
import { fetchGitHubThemes } from './fetchGitHubThemes.js';
import { downloadThemeFromGitHub } from './downloadThemeFromGitHub.js';

export {
  ensureDefaultTheme,
  loadTheme,
  listThemes,
  getThemeMetadata,
  fetchGitHubThemes,
  downloadThemeFromGitHub
};

// Client helper: copyText used by widgets page (inlined script depends on this)
export function clientHelpers() {
  // No-op sentinel for import side effects
}

