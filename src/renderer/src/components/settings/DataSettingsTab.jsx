import React, { useState, useEffect } from 'react';
import { Save, Download, Upload, Trash2, Check, UserCheck } from 'lucide-react';

const DataSettingsTab = ({
  onSaveProfile,
  onLoadProfile,
  onDeleteProfile,
  onListProfiles,
  onExportProfile,
  onExportData,
  onImportData,
  onClose,
}) => {
  const [profiles, setProfiles] = useState([]);
  const [newProfileName, setNewProfileName] = useState('');
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);

  useEffect(() => {
    const loadProfiles = async () => {
      if (onListProfiles) {
        const profilesList = await onListProfiles();
        setProfiles(profilesList);
      }
    };
    loadProfiles();
  }, [onListProfiles, profileRefreshKey]);

  const refreshProfiles = () => {
    setProfileRefreshKey(prev => prev + 1);
  };

  const handleSaveNewProfile = async () => {
    if (!newProfileName.trim()) {
      alert('Please enter a profile name');
      return;
    }
    
    const profileName = newProfileName.trim();
    
    if (onSaveProfile && await onSaveProfile(profileName)) {
      setNewProfileName('');
      refreshProfiles();
      alert(`Profile "${profileName}" saved successfully!`);
    }
  };

  const handleLoadProfileClick = async (profileName) => {
    if (window.confirm(`Load profile "${profileName}"? This will replace your current settings.`)) {
      if (onLoadProfile && await onLoadProfile(profileName)) {
        alert(`Profile "${profileName}" loaded successfully!`);
        onClose();
      }
    }
  };

  const handleDeleteProfileClick = async (profileName) => {
    if (window.confirm(`Delete profile "${profileName}"? This cannot be undone.`)) {
      if (onDeleteProfile && await onDeleteProfile(profileName)) {
        refreshProfiles();
        alert(`Profile "${profileName}" deleted successfully!`);
      }
    }
  };

  const handleExportProfileClick = async (profileName) => {
    if (onExportProfile) {
      await onExportProfile(profileName);
    }
  };

  return (
    <>
      {/* PROFILE & BACKUP SECTION */}
      {onSaveProfile && onLoadProfile && onDeleteProfile && onListProfiles && (
        <div className="settings-section settings-card">
          <h3 className="settings-section-title">Profile & Backup Manager</h3>
          <p className="settings-section-sub">Manage settings profiles and full data backups in one place.</p>
          
          {/* Quick Actions Row */}
          <div className="profile-quick-actions">
            <div className="profile-create-row">
              <input
                type="text"
                className="profile-name-input"
                placeholder="Profile name..."
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveNewProfile();
                  }
                }}
              />
              <button 
                className="settings-button primary"
                onClick={handleSaveNewProfile}
                disabled={!newProfileName.trim()}
                title="Save current settings as profile"
              >
                <Save size={16} /> Save Profile
              </button>
            </div>
          </div>

          {/* Import/Export buttons */}
          <div className="profile-backup-actions">
            {onExportData && (
              <button className="settings-button primary" onClick={onExportData} title="Export all settings to file">
                <Download size={16} /> Export Profile
              </button>
            )}
            {onImportData && (
              <label className="settings-button" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }} title="Import settings from file">
                <Upload size={16} /> Import Profile
                <input
                  type="file"
                  accept=".json"
                  onChange={onImportData}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>

          {/* Profiles list */}
          {profiles.length > 0 ? (
            <div className="profiles-list">
              <div className="profiles-list-header">
                <span>Saved Profiles (Settings Only)</span>
              </div>
              {profiles.map((profile) => (
                <div key={profile.name} className="profile-item">
                  <div 
                    className="profile-info"
                    onClick={() => setNewProfileName(profile.name)}
                    style={{ cursor: 'pointer' }}
                    title="Click to edit/update this profile"
                  >
                    <div className="profile-name">
                      <UserCheck size={16} />
                      {profile.name}
                    </div>
                    <div className="profile-date">
                      {new Date(profile.savedDate).toLocaleString()}
                    </div>
                  </div>
                  <div className="profile-actions">
                    <button
                      className="profile-action-btn load"
                      onClick={() => handleLoadProfileClick(profile.name)}
                      title="Load this profile"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      className="profile-action-btn export"
                      onClick={() => handleExportProfileClick(profile.name)}
                      title="Export to file"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      className="profile-action-btn delete"
                      onClick={() => handleDeleteProfileClick(profile.name)}
                      title="Delete profile"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="profiles-empty">
              <p>No saved profiles yet. Create your first profile above!</p>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default DataSettingsTab;
