export const handlePlayPause = ({ isPlaying, setIsPlaying }) => {
  setIsPlaying(!isPlaying);
};

export const handleSongSelect = ({
  song,
  currentSong,
  isPlaying,
  setIsPlaying,
  setCurrentSong,
  setCurrentTime
}) => {
  // Check if it's the same song AND same difficulty (for difficulty variants)
  const isSameSong = currentSong?.id === song.id && 
                      currentSong?._difficultyFilename === song._difficultyFilename;
  
  if (isSameSong && isPlaying) {
    setIsPlaying(false);
    return;
  }
  if (isSameSong && !isPlaying) {
    setIsPlaying(true);
    return;
  }
  // Different song or different difficulty - change song
  setCurrentSong(song);
  setCurrentTime(0);
  setIsPlaying(true);
};

export const handleNext = ({
  displayedSongs,
  getCurrentSongs,
  currentSong,
  shuffle,
  shuffleOrder,
  shuffleHistoryRef,
  handleSongSelect
}) => {
  const currentList = displayedSongs.length > 0 ? displayedSongs : getCurrentSongs();
  if (!currentSong || currentList.length === 0) return;

  if (shuffle && shuffleOrder.length > 0) {
    const currentIndex = shuffleOrder.indexOf(currentSong.id);
    if (currentIndex !== -1 && currentIndex < shuffleOrder.length - 1) {
      const nextId = shuffleOrder[currentIndex + 1];
      const nextSong = currentList.find((s) => s.id === nextId);
      if (nextSong) {
        handleSongSelect(nextSong);
        return;
      }
    }
    const availableSongs = currentList.filter((s) => !shuffleHistoryRef.current.includes(s.id));
    if (availableSongs.length > 0) {
      const nextSong = availableSongs[Math.floor(Math.random() * availableSongs.length)];
      handleSongSelect(nextSong);
      return;
    }
    shuffleHistoryRef.current = [];
    const randomSong = currentList[Math.floor(Math.random() * currentList.length)];
    handleSongSelect(randomSong);
    return;
  }

  const currentIndex = currentList.findIndex((s) => s.id === currentSong.id);
  const nextIndex = (currentIndex + 1) % currentList.length;
  handleSongSelect(currentList[nextIndex]);
};

export const handlePrevious = ({
  displayedSongs,
  getCurrentSongs,
  currentSong,
  repeat,
  playbackHistoryRef,
  handleSongSelect
}) => {
  const currentList = displayedSongs.length > 0 ? displayedSongs : getCurrentSongs();
  if (!currentSong || currentList.length === 0) return;
  if (repeat) return;

  const history = playbackHistoryRef.current;
  if (history.length > 1) {
    history.pop();
    const prevId = history[history.length - 1];
    const prevSong = currentList.find((s) => s.id === prevId);
    if (prevSong) {
      handleSongSelect(prevSong);
      return;
    }
  }
  const currentIndex = currentList.findIndex((s) => s.id === currentSong.id);
  const prevIndex = currentIndex === 0 ? currentList.length - 1 : currentIndex - 1;
  handleSongSelect(currentList[prevIndex]);
};
