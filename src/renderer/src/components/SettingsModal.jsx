import React, { useState, useRef, useEffect } from 'react';
import { X, Settings, Palette, Monitor, Filter, Database, RotateCcw } from 'lucide-react';
import './SettingsModal.css';
import GeneralSettingsTab from './settings/GeneralSettingsTab';
import AppearanceSettingsTab from './settings/AppearanceSettingsTab';
import IntegrationsSettingsTab from './settings/IntegrationsSettingsTab';
import FiltersSettingsTab from './settings/FiltersSettingsTab';
import DataSettingsTab from './settings/DataSettingsTab';
import ResetSettingsTab from './settings/ResetSettingsTab';

const SettingsModal = ({ isOpen, onClose, osuFolderPath, onSelectFolder, onRemoveFolder, discordRpcEnabled, onSetDiscordRpcEnabled, widgetServerEnabled, onSetWidgetServerEnabled, albumArtBlur, onSetAlbumArtBlur, blurIntensity, onSetBlurIntensity, accentColor, onSetAccentColor, onClearCache, minDurationValue, setMinDurationValue, itemsPerPage, setItemsPerPage, onExportData, onImportData, onResetApp, hiddenArtists, setHiddenArtists, nameFilter, setNameFilter, nameFilterMode, setNameFilterMode, getAllArtists, filterStats, scanAllMaps, setScanAllMaps, dedupeTitlesEnabled, setDedupeTitlesEnabled, showSongBadges, onSetShowSongBadges, totalScanned, vuEnabled, onSetVuEnabled, onSaveProfile, onLoadProfile, onDeleteProfile, onListProfiles, onExportProfile, closeToTray, onSetCloseToTray, askBeforeClose, onSetAskBeforeClose, hardwareAcceleration, onSetHardwareAcceleration }) => {
  const [activeTab, setActiveTab] = useState('general');
  const tabsRef = useRef(null);

  // Enable horizontal scroll with mouse wheel on tabs
  useEffect(() => {
    const tabsElement = tabsRef.current;
    if (!tabsElement) return;

    const handleWheel = (e) => {
      const hasHorizontalScroll = tabsElement.scrollWidth > tabsElement.clientWidth;
      if (hasHorizontalScroll && e.deltaY !== 0) {
        e.preventDefault();
        e.stopPropagation();
        tabsElement.scrollLeft += e.deltaY;
      }
    };

    tabsElement.addEventListener('wheel', handleWheel, { passive: false });
    return () => tabsElement.removeEventListener('wheel', handleWheel);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Settings</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="settings-tabs" ref={tabsRef}>
          <button 
            className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            <Settings size={16} />
            General
          </button>
          <button 
            className={`settings-tab ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            <Palette size={16} />
            Appearance
          </button>
          <button 
            className={`settings-tab ${activeTab === 'integrations' ? 'active' : ''}`}
            onClick={() => setActiveTab('integrations')}
          >
            <Monitor size={16} />
            Integrations
          </button>
          <button 
            className={`settings-tab ${activeTab === 'filters' ? 'active' : ''}`}
            onClick={() => setActiveTab('filters')}
          >
            <Filter size={16} />
            Filters
          </button>
          <button 
            className={`settings-tab ${activeTab === 'data' ? 'active' : ''}`}
            onClick={() => setActiveTab('data')}
          >
            <Database size={16} />
            Data
          </button>
          <button 
            className={`settings-tab ${activeTab === 'reset' ? 'active' : ''}`}
            onClick={() => setActiveTab('reset')}
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>

        <div className="settings-content">
          {/* GENERAL TAB */}
          {activeTab === 'general' && (
            <GeneralSettingsTab
              osuFolderPath={osuFolderPath}
              onSelectFolder={onSelectFolder}
              onRemoveFolder={onRemoveFolder}
              onClearCache={onClearCache}
              onClose={onClose}
              scanAllMaps={scanAllMaps}
              setScanAllMaps={setScanAllMaps}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
              closeToTray={closeToTray}
              onSetCloseToTray={onSetCloseToTray}
              askBeforeClose={askBeforeClose}
              onSetAskBeforeClose={onSetAskBeforeClose}
              hardwareAcceleration={hardwareAcceleration}
              onSetHardwareAcceleration={onSetHardwareAcceleration}
              totalScanned={totalScanned}
            />
          )}

          {/* APPEARANCE TAB */}
          {activeTab === 'appearance' && (
            <AppearanceSettingsTab
              albumArtBlur={albumArtBlur}
              onSetAlbumArtBlur={onSetAlbumArtBlur}
              blurIntensity={blurIntensity}
              onSetBlurIntensity={onSetBlurIntensity}
              accentColor={accentColor}
              onSetAccentColor={onSetAccentColor}
              vuEnabled={vuEnabled}
              onSetVuEnabled={onSetVuEnabled}
              showSongBadges={showSongBadges}
              onSetShowSongBadges={onSetShowSongBadges}
            />
          )}

          {/* INTEGRATIONS TAB */}
          {activeTab === 'integrations' && (
            <IntegrationsSettingsTab
              discordRpcEnabled={discordRpcEnabled}
              onSetDiscordRpcEnabled={onSetDiscordRpcEnabled}
              widgetServerEnabled={widgetServerEnabled}
              onSetWidgetServerEnabled={onSetWidgetServerEnabled}
            />
          )}

          {/* FILTERS TAB */}
          {activeTab === 'filters' && (
            <FiltersSettingsTab
              minDurationValue={minDurationValue}
              setMinDurationValue={setMinDurationValue}
              dedupeTitlesEnabled={dedupeTitlesEnabled}
              setDedupeTitlesEnabled={setDedupeTitlesEnabled}
              hiddenArtists={hiddenArtists}
              setHiddenArtists={setHiddenArtists}
              nameFilter={nameFilter}
              setNameFilter={setNameFilter}
              nameFilterMode={nameFilterMode}
              setNameFilterMode={setNameFilterMode}
              getAllArtists={getAllArtists}
              filterStats={filterStats}
            />
          )}

          {/* DATA TAB */}
          {activeTab === 'data' && (
            <DataSettingsTab
              onSaveProfile={onSaveProfile}
              onLoadProfile={onLoadProfile}
              onDeleteProfile={onDeleteProfile}
              onListProfiles={onListProfiles}
              onExportProfile={onExportProfile}
              onExportData={onExportData}
              onImportData={onImportData}
              onClose={onClose}
            />
          )}

          {/* RESET TAB */}
          {activeTab === 'reset' && (
            <ResetSettingsTab
              onResetApp={onResetApp}
              onClearCache={onClearCache}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
