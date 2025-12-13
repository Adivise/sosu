import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import './SearchBar.css';

const SearchBar = ({ searchQuery, onSearchChange, songs, showFilters = false }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    if (searchQuery.trim() && songs.length > 0) {
      const query = searchQuery.toLowerCase();
      const matches = songs
        .filter(song => 
          song.title.toLowerCase().includes(query) ||
          song.artist.toLowerCase().includes(query) ||
          song.folderName.toLowerCase().includes(query)
        )
        .slice(0, 8)
        .map(song => ({
            ...song, 
            matchType: song.title.toLowerCase().includes(query) ? 'title' : song.artist.toLowerCase().includes(query) ? 'artist' : 'folder'
          }
      ));
      
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
    setSelectedIndex(-1);
  }, [searchQuery, songs]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) &&
          searchRef.current && !searchRef.current.contains(event.target)) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      onSearchChange(suggestions[selectedIndex].title);
      setIsFocused(false);
    } else if (e.key === 'Escape') {
      setIsFocused(false);
    }
  };

  const handleSuggestionClick = (song) => {
    onSearchChange(song.title);
    setIsFocused(false);
  };

  const clearSearch = () => {
    onSearchChange('');
    searchRef.current?.focus();
  };

  return (
    <div className="search-container">
      <div className="search-bar-wrapper">
        <Search className="search-icon" size={20} />
        <input
          ref={searchRef}
          type="text"
          className="search-input"
          placeholder="What do you want to play?"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
        />
        {searchQuery && (
          <button className="clear-button" onClick={clearSearch}>
            <X size={18} />
          </button>
        )}
      </div>

      {isFocused && suggestions.length > 0 && (
        <div ref={suggestionsRef} className="suggestions-dropdown">
          <div className="suggestions-header">
            <span>Suggestions</span>
          </div>
          {suggestions.map((song, index) => (
            <div
              key={song.id}
              className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => handleSuggestionClick(song)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="suggestion-content">
                <div className="suggestion-title">{song.title}</div>
                <div className="suggestion-artist">{song.artist}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;

