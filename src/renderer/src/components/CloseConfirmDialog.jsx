import { useState } from 'react';
import { X, Minimize2, Power, AlertCircle } from 'lucide-react';
import './CloseConfirmDialog.css';

const CloseConfirmDialog = ({ isOpen, onMinimize, onQuit, onCancel }) => {
  const [dontAskAgain, setDontAskAgain] = useState(false);

  if (!isOpen) return null;

  const handleMinimize = () => {
    onCancel();
    setTimeout(() => onMinimize(dontAskAgain), 0);
  };

  const handleQuit = () => {
    onCancel();
    onQuit(dontAskAgain);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="close-confirm-dialog" onClick={e => e.stopPropagation()}>
        <button className="close-dialog-x" onClick={onCancel}>
          <X size={20} />
        </button>

        <div className="close-confirm-content">
          <div className="close-confirm-icon">
            <AlertCircle size={48} />
          </div>
          
          <h2 className="close-confirm-title">Close Application?</h2>
          
          <p className="close-confirm-message">
            Choose how you want to close the app
          </p>

          <div className="close-confirm-buttons">
            <button 
              className="close-confirm-btn minimize"
              onClick={handleMinimize}
            >
              <div className="btn-icon-wrapper">
                <Minimize2 size={20} />
              </div>
              <div className="btn-text">
                <div className="btn-title">Minimize to Tray</div>
                <div className="btn-desc">Keep running in background</div>
              </div>
            </button>
            <button 
              className="close-confirm-btn quit"
              onClick={handleQuit}
            >
              <div className="btn-icon-wrapper">
                <Power size={20} />
              </div>
              <div className="btn-text">
                <div className="btn-title">Quit Application</div>
                <div className="btn-desc">Stop all processes</div>
              </div>
            </button>
          </div>

          <label className="close-confirm-checkbox">
            <input
              type="checkbox"
              checked={dontAskAgain}
              onChange={(e) => setDontAskAgain(e.target.checked)}
            />
            <span>Remember my choice and don't ask again</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default CloseConfirmDialog;
