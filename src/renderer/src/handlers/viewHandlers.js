export const handleViewChange = ({ view, setCurrentView, setSelectedPlaylistId }) => {
  setCurrentView(view);
  setSelectedPlaylistId(null);
};

export const handleSelectPlaylist = ({ playlistId, setSelectedPlaylistId, setCurrentView }) => {
  setSelectedPlaylistId(playlistId);
  setCurrentView(`playlist-${playlistId}`);
};
