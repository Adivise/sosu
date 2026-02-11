import { Music2, FolderOpen } from 'lucide-react';
import './FirstRunScreen.css';

const FirstRunScreen = ({ onSelectFolder, errorMessage }) => {
  return (
    <div className="first-run-screen">
      <div className="first-run-content">
        <div className="first-run-icon-wrapper">
          <Music2 size={80} className="first-run-icon" />
          <div className="first-run-pulse-ring"></div>
          <div className="first-run-pulse-ring delay-1"></div>
          <div className="first-run-pulse-ring delay-2"></div>
        </div>
        <h1 className="first-run-title">
          <span className="first-run-title-main">Welcome to SOSU</span>
        </h1>
        <p className="first-run-subtitle">osu! Music Player</p>
        <p className="first-run-description">
          To get started, please select your osu! Songs folder.
          <br />
          This folder typically contains all your downloaded beatmaps.
        </p>
        {errorMessage && (
          <div className="first-run-error" role="alert">
            {errorMessage}
          </div>
        )}
        <button 
          className="first-run-button"
          onClick={onSelectFolder}
        >
          <FolderOpen size={20} />
          Select Songs Folder
        </button>
        <p className="first-run-hint">
          Usually located at: <code>C:\Users\YourName\AppData\Local\osu!\Songs</code>
        </p>
      </div>
      <div className="first-run-background-gradient"></div>
    </div>
  );
};

export default FirstRunScreen;

