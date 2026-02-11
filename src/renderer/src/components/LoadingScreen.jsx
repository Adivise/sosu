import { Music2 } from 'lucide-react';
import './LoadingScreen.css';
import { VERSION } from '../version';

const LoadingScreen = ({ loadingProgress = { current: 0, total: 0 } }) => {
  const percentage = loadingProgress.total > 0 
    ? Math.round((loadingProgress.current / loadingProgress.total) * 100)
    : 0;

  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-icon-wrapper">
          <Music2 size={64} className="loading-icon" />
          <div className="loading-pulse-ring"></div>
          <div className="loading-pulse-ring delay-1"></div>
          <div className="loading-pulse-ring delay-2"></div>
        </div>
        <h1 className="loading-title">
          <span className="loading-title-main">SOSU</span>
          <span className="loading-version">v{VERSION}</span>
        </h1>
        <p className="loading-subtitle">osu! Music Player</p>
        <div className="loading-spinner-container">
          <div className="loading-spinner">
            <div className="loading-bar"></div>
            <div className="loading-bar"></div>
            <div className="loading-bar"></div>
          </div>
          <p className="loading-text">Loading your music library...</p>
          
          {loadingProgress.total > 0 && (
            <>
              <div className="loading-progress-bar-container">
                <div className="loading-progress-bar">
                  <div 
                    className="loading-progress-fill" 
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
              <div className="loading-progress-info">
                <span className="loading-percentage">{percentage}%</span>
                <span className="loading-count">
                  {loadingProgress.current} / {loadingProgress.total} songs
                </span>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="loading-background-gradient"></div>
    </div>
  );
};

export default LoadingScreen;
