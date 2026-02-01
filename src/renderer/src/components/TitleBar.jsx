import React from 'react';
import { Minus, Square, X } from 'lucide-react';
import './TitleBar.css';

const TitleBar = ({ currentSong }) => {
  const handleMinimize = () => {
    if (window.electronAPI?.windowMinimize) {
      window.electronAPI.windowMinimize();
    }
  };

  const handleMaximize = () => {
    if (window.electronAPI?.windowMaximize) {
      window.electronAPI.windowMaximize();
    }
  };

  const handleClose = () => {
    if (window.electronAPI?.windowClose) {
      window.electronAPI.windowClose();
    }
  };

  const titleText = currentSong ? `${currentSong.title}${currentSong.artist ? ' — ' + currentSong.artist : ''}` : 'sosu';

  return (
    <div className="title-bar">
      <div className="title-bar-drag-region">
        <div className="title-bar-title" title={titleText} aria-label={titleText}>{titleText}</div>
      </div>
      <div className="title-bar-controls">
        <button 
          className="title-bar-button minimize-button"
          onClick={handleMinimize}
          title="Minimize"
        >
          <Minus size={12} />
        </button>
        <button 
          className="title-bar-button maximize-button"
          onClick={handleMaximize}
          title="Maximize"
        >
          <Square size={10} />
        </button>
        <button 
          className="title-bar-button close-button"
          onClick={handleClose}
          title="Close"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;

