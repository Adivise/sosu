import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import SearchSuggestions from './SearchSuggestions';
import './SearchBar.css';

const SearchBar = ({ searchQuery, onSearchChange, songs, showFilters = false, sortBy, onSortChange, sortDuration, onSortDurationChange }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchHistory, setSearchHistory] = useState(() => {
    const saved = localStorage.getItem('searchHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const searchRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    if (searchQuery.trim() && songs.length > 0) {
      const query = searchQuery.toLowerCase();
      const matches = songs
        .filter(song => 
          (song.title || '').toLowerCase().includes(query) ||
          (song.artist || '').toLowerCase().includes(query) ||
          (song.folderName || '').toLowerCase().includes(query) ||
          (song.version || '').toLowerCase().includes(query)
        )
        .slice(0, 8)
        .map(song => {
          const titleHit = (song.title || '').toLowerCase().includes(query);
          const artistHit = (song.artist || '').toLowerCase().includes(query);
          const folderHit = (song.folderName || '').toLowerCase().includes(query);
          const versionHit = (song.version || '').toLowerCase().includes(query);

          return {
            ...song,
            matchType: titleHit ? 'title' : artistHit ? 'artist' : folderHit ? 'folder' : versionHit ? 'version' : 'title'
          };
        });
      
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

  // Listen for programmatic search queries (e.g., clicking artist in PlayerBar)
  useEffect(() => {
    const handler = (ev) => {
      const q = ev?.detail?.query || '';
      if (typeof onSearchChange === 'function') {
        onSearchChange(q);
        setIsFocused(true);
        // Focus input and move cursor to end
        if (searchRef.current) {
          searchRef.current.focus();
          const v = searchRef.current.value || '';
          try { searchRef.current.selectionStart = searchRef.current.selectionEnd = v.length; } catch(e) {}
        }
      }
    };
    window.addEventListener('sosu:set-search-query', handler);
    return () => window.removeEventListener('sosu:set-search-query', handler);
  }, [onSearchChange]);

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
      const s = suggestions[selectedIndex];
      const query = s.matchType === 'artist'
        ? s.artist
        : s.matchType === 'version'
          ? (s.version || s.title || '')
          : s.title;
      onSearchChange(query);
      addToHistory(query);
      setIsFocused(false);
    } else if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      addToHistory(searchQuery);
      setIsFocused(false);
    } else if (e.key === 'Escape') {
      setIsFocused(false);
    }
  };

  const handleSuggestionClick = (song) => {
    const newQuery = song.matchType === 'artist'
      ? song.artist
      : song.matchType === 'version'
        ? (song.version || song.title || '')
        : song.title;
    onSearchChange(newQuery);
    addToHistory(newQuery);
    setIsFocused(false);
  };

  const addToHistory = (query) => {
    if (!query.trim()) return;
    const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('searchHistory');
  };

  const handleHistoryClick = (query) => {
    onSearchChange(query);
    setIsFocused(false);
  };

  const clearSearch = () => {
    onSearchChange('');
    searchRef.current?.focus();
  };

  // Cycle through sort options: none -> az -> za -> none
  // If current sort is an unrelated mode (e.g., artist-az), switch to name asc
  const handleSortCycle = () => {
    if (sortBy === 'none') {
      onSortChange('az');
      onSortDurationChange('none'); // Reset duration sort when Name is selected
    } else if (sortBy === 'az') {
      onSortChange('za');
    } else if (sortBy === 'za') {
      onSortChange('none');
    } else {
      // Any other mode (artist-az/za etc) -> switch to Name asc
      onSortChange('az');
      onSortDurationChange('none');
    }
  };

  // Cycle through duration sort: none -> asc -> desc -> none
  const handleDurationSortCycle = () => {
    if (sortDuration === 'none') {
      onSortDurationChange('asc');
      onSortChange('none'); // Reset name sort when Duration is selected
    } else if (sortDuration === 'asc') {
      onSortDurationChange('desc');
    } else {
      onSortDurationChange('none');
    }
  };

  const getSortIcon = () => {
    if (sortBy === 'az') return '↑';
    if (sortBy === 'za') return '↓';
    return '◇'; // neutral indicator when none
  };

  const getDurationSortIcon = () => {
    if (sortDuration === 'asc') return '↑';
    if (sortDuration === 'desc') return '↓';
    return '◇'; // neutral indicator when none
  };

  return (
    <>
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

        {showFilters && (
          <>
            <div className="search-filters">
              <span className="filter-label">Sort:</span>
              <button
                className={`filter-chip ${(sortBy === 'az' || sortBy === 'za') ? 'active' : ''}`}
                onClick={handleSortCycle}
                title="Cycle: A-Z → Z-A → None"
              >
                Name {getSortIcon()}
              </button>
              <button
                className={`filter-chip ${sortBy === 'artist-az' || sortBy === 'artist-za' ? 'active' : ''}`}
                onClick={() => {
                  // Cycle artist sort: none -> artist-az -> artist-za -> none
                  if (sortBy === 'artist-az') onSortChange('artist-za');
                  else if (sortBy === 'artist-za') onSortChange('none');
                  else onSortChange('artist-az');
                  onSortDurationChange('none'); // reset duration sort
                }}
                title="Cycle: Artist A-Z → Artist Z-A → None"
              >
                Artist {sortBy === 'artist-az' ? '↑' : sortBy === 'artist-za' ? '↓' : '◇'}
              </button>
              <button
                className={`filter-chip ${sortDuration !== 'none' ? 'active' : ''}`}
                onClick={handleDurationSortCycle}
                title="Cycle: Short → Long → None"
              >
                Duration {getDurationSortIcon()}
              </button>
            </div>
            </>
        )}
      </div>

      <SearchSuggestions
        isFocused={isFocused}
        suggestions={suggestions}
        searchHistory={searchHistory}
        searchQuery={searchQuery}
        selectedIndex={selectedIndex}
        onSuggestionClick={handleSuggestionClick}
        onHistoryClick={handleHistoryClick}
        onClearHistory={clearHistory}
        onSetIsFocused={setIsFocused}
        searchInputRef={searchRef}
      />
    </>
  );
};

export default SearchBar;
