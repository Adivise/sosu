export const createPlaylist = ({ name, playlists, setPlaylists }) => {
  const newPlaylist = {
    id: Date.now().toString(),
    name,
    songs: [],
    createdAt: new Date().toISOString()
  };
  setPlaylists([...playlists, newPlaylist]);
};

export const addSongToPlaylist = ({ playlistId, song, setPlaylists }) => {
  const pid = String(playlistId);
  setPlaylists((prev) => {
    const next = prev.map((playlist) => {
      if (String(playlist.id) === pid) {
        if (!playlist.songs.find((s) => String(s.id) === String(song.id))) {
          return { ...playlist, songs: [...playlist.songs, song] };
        }
      }
      return playlist;
    });

    try {
      window.dispatchEvent(
        new CustomEvent('sosu:playlist-updated', { detail: { playlistId: pid, song, playlists: next } })
      );
    } catch (e) {
      console.error('dispatch playlist-updated failed', e);
    }

    return next;
  });

  try {
    window.__sosu_addSongToPlaylist = (targetPlaylistId, targetSong) => {
      addSongToPlaylist({ playlistId: targetPlaylistId, song: targetSong, setPlaylists });
    };
  } catch (e) {}
};

export const removeSongFromPlaylist = ({ playlistId, songId, playlists, setPlaylists }) => {
  setPlaylists(
    playlists.map((playlist) => {
      if (playlist.id === playlistId) {
        return { ...playlist, songs: playlist.songs.filter((s) => s.id !== songId) };
      }
      return playlist;
    })
  );
};

export const requestDeletePlaylist = ({ playlistId, playlists, setConfirmDelete }) => {
  const target = playlists.find((p) => p.id === playlistId);
  setConfirmDelete({ id: playlistId, name: target?.name || '' });
};

export const confirmDeletePlaylist = ({
  playlistId,
  playlists,
  setPlaylists,
  setSelectedPlaylistId,
  setCurrentView,
  setConfirmDelete,
  lastPlaylistDeletedAtRef
}) => {
  setPlaylists(playlists.filter((p) => p.id !== playlistId));
  try {
    lastPlaylistDeletedAtRef.current = Date.now();
  } catch (e) {}

  try {
    setTimeout(() => {
      try {
        if (document && document.activeElement) {
          document.activeElement.blur();
        }
      } catch (e) {}
    }, 0);
  } catch (e) {}

  if (setSelectedPlaylistId && setCurrentView) {
    setSelectedPlaylistId((currentId) => {
      if (currentId === playlistId) {
        setCurrentView('songs');
        return null;
      }
      return currentId;
    });
  }

  setConfirmDelete(null);
};

export const cancelDeletePlaylist = ({ setConfirmDelete }) => {
  setConfirmDelete(null);
};

export const renamePlaylist = ({ playlistId, newName, playlists, setPlaylists }) => {
  if (!newName || !newName.trim()) return;
  setPlaylists(
    playlists.map((playlist) => {
      if (playlist.id === playlistId) {
        return { ...playlist, name: newName.trim() };
      }
      return playlist;
    })
  );
};

export const ensurePlaylistGlobalHelper = ({ addSongToPlaylist, setPlaylists }) => {
  try {
    window.__sosu_addSongToPlaylist = (playlistId, song) => {
      addSongToPlaylist({ playlistId, song, setPlaylists });
    };
  } catch (e) {}
};
