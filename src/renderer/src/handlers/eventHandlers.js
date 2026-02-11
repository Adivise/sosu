export const registerHighlightSongEvent = ({ setHighlightedSongId }) => {
  const handler = (ev) => {
    try {
      const songId = ev?.detail?.songId;
      if (!songId) return;
      setHighlightedSongId(songId);
      setTimeout(() => {
        setHighlightedSongId(null);
      }, 2500);
    } catch (e) {}
  };

  window.addEventListener('sosu:highlight-song', handler);
  return () => window.removeEventListener('sosu:highlight-song', handler);
};

export const registerOpenSettingsEvent = ({ setShowSettingsModal }) => {
  const handler = () => setShowSettingsModal(true);
  window.addEventListener('sosu:open-settings', handler);
  return () => window.removeEventListener('sosu:open-settings', handler);
};

export const registerCreatePlaylistEvent = ({ setShowCreatePlaylistModal, lastPlaylistDeletedAtRef }) => {
  const handler = () => {
    try {
      console.debug && console.debug('[App] received sosu:create-playlist event, activeElement:', document.activeElement && (document.activeElement.tagName + ' ' + (document.activeElement.id || document.activeElement.className || '')));
    } catch (e) {}

    let delay = 30;
    try {
      const lastDel = lastPlaylistDeletedAtRef.current || 0;
      if (Date.now() - lastDel < 800) {
        delay = 350;
        console.debug && console.debug('[App] delaying open CreatePlaylistModal due to recent delete', { sinceMs: Date.now() - lastDel });
      }
    } catch (e) {}

    setTimeout(() => {
      try {
        setShowCreatePlaylistModal(true);
        console.debug && console.debug('[App] scheduled open CreatePlaylistModal');
      } catch (e) {}
    }, delay);
  };

  window.addEventListener('sosu:create-playlist', handler);
  return () => window.removeEventListener('sosu:create-playlist', handler);
};
