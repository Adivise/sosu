export const buildShuffleOrder = ({ songs, currentSongId }) => {
  const list = Array.isArray(songs) ? songs : [];
  if (list.length === 0) return [];

  const availableSongs = list.filter((s) => s.id !== currentSongId);
  const shuffled = [...availableSongs].sort(() => Math.random() - 0.5);
  return currentSongId ? [currentSongId, ...shuffled.map((s) => s.id)] : shuffled.map((s) => s.id);
};

export const updateShuffleHistory = ({
  shuffle,
  currentSong,
  songsLength,
  shuffleHistoryRef
}) => {
  if (!shuffle || !currentSong) return;
  const history = shuffleHistoryRef.current;
  if (!history.includes(currentSong.id)) {
    history.push(currentSong.id);
    if (history.length > songsLength * 2) {
      history.shift();
    }
  }
};

export const updatePlaybackHistory = ({ currentSong, songsLength, playbackHistoryRef }) => {
  if (!currentSong) return;
  const history = playbackHistoryRef.current;
  if (history.length === 0 || history[history.length - 1] !== currentSong.id) {
    history.push(currentSong.id);
    if (history.length > songsLength * 3) {
      history.shift();
    }
  }
};
