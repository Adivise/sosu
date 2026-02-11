export const getAllArtists = (songs) => {
  const list = Array.isArray(songs) ? songs : [];
  const artistsSet = new Set();
  list.forEach((song) => {
    if (song.artist) {
      artistsSet.add(song.artist);
    }
  });
  return Array.from(artistsSet).sort();
};
