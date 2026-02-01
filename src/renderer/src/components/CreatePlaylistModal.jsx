import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import './CreatePlaylistModal.css';

const CreatePlaylistModal = ({ isOpen, onClose, onCreate }) => {
  const [playlistName, setPlaylistName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const tryFocus = () => {
      try {
        // Blur any currently focused element first to avoid races where a button remains focused
        try { if (document && document.activeElement && document.activeElement !== inputRef.current) { document.activeElement.blur(); } } catch (e) {}

        if (inputRef.current) {
          // focus and select text if any; try multiple scheduling strategies to avoid races with dialogs/transitions
          inputRef.current.focus();
          try { inputRef.current.select && inputRef.current.select(); } catch (e) {}
          console.debug && console.debug('[CreatePlaylistModal] attempted focus on input');
        }
      } catch (e) {}
    };

    // Attempt immediate focus, then schedule for next ticks in case focus was blocked
    tryFocus();
    const t1 = setTimeout(tryFocus, 20);
    const t2 = setTimeout(tryFocus, 120);
    const t3 = setTimeout(tryFocus, 200);
    const t4 = setTimeout(tryFocus, 500);
    const raf = requestAnimationFrame(tryFocus);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      try { cancelAnimationFrame(raf); } catch (e) {}
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setPlaylistName('');
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (playlistName.trim()) {
      onCreate(playlistName.trim());
      setPlaylistName('');
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="modal-header">
          <h2 className="modal-title">Create Playlist</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <input
            ref={inputRef}
            type="text"
            className="modal-input"
            placeholder="Enter playlist name"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            autoFocus
          />
          <div className="modal-actions">
            <button type="button" className="modal-button cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="modal-button create" disabled={!playlistName.trim()}>
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePlaylistModal;

