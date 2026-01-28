import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { History, Trash2 } from 'lucide-react';
import './SearchBar.css';

const SearchSuggestions = ({
  isFocused,
  suggestions,
  searchHistory,
  searchQuery,
  selectedIndex,
  onSuggestionClick,
  onHistoryClick,
  onClearHistory,
  onSetIsFocused,
  searchInputRef
}) => {
  const suggestionsRef = useRef(null);
  const [position, setPosition] = React.useState({ top: 0, left: 0, width: 0, containerWidth: 0 });

  useEffect(() => {
    if (!isFocused || (!suggestions.length && (!searchHistory.length || searchQuery.trim()))) {
      return;
    }

    const updatePosition = () => {
      if (searchInputRef?.current) {
        const rect = searchInputRef.current.getBoundingClientRect();
        const container = searchInputRef.current.closest('.search-container');
        const containerRect = container?.getBoundingClientRect();
        
        setPosition({
          top: rect.bottom,
          left: containerRect?.left || rect.left,
          width: containerRect?.width || rect.width,
          containerWidth: containerRect?.width || rect.width
        });
      }
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isFocused, suggestions.length, searchHistory.length, searchQuery, searchInputRef]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) &&
          searchInputRef?.current && !searchInputRef.current.contains(event.target)) {
        onSetIsFocused(false);
      }
    };

    if (isFocused) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFocused, searchInputRef, onSetIsFocused]);

  if (!isFocused || (suggestions.length === 0 && (searchHistory.length === 0 || searchQuery.trim()))) {
    return null;
  }

  const dropdownContent = (
    <div
      ref={suggestionsRef}
      className="suggestions-dropdown-portal"
      style={{
        position: 'fixed',
        top: position.top + 9,
        left: position.left,
        width: position.containerWidth,
        zIndex: 99999
      }}
    >
      {suggestions.length > 0 ? (
        <>
          <div className="suggestions-header">
            <span>Suggestions</span>
          </div>
          {suggestions.map((song, index) => (
            <div
              key={song.id}
              className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => onSuggestionClick(song)}
              onMouseEnter={() => {}}
            >
              <div className="suggestion-content">
                <div className="suggestion-title">{song.title}</div>
                <div className="suggestion-artist">{song.artist}</div>
              </div>
            </div>
          ))}
        </>
      ) : (
        <>
          <div className="suggestions-header">
            <span><History size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Recent Searches</span>
            <button className="clear-history-btn" onClick={onClearHistory} title="Clear history">
              <Trash2 size={14} />
            </button>
          </div>
          {searchHistory.map((query, index) => (
            <div
              key={index}
              className="suggestion-item history-item"
              onClick={() => onHistoryClick(query)}
            >
              <History size={16} className="history-icon" />
              <div className="suggestion-content">
                <div className="suggestion-title">{query}</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );

  return createPortal(dropdownContent, document.body);
};

export default SearchSuggestions;
