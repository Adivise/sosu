declare global {
  interface Window {
    electronAPI: {
      // Folder and Cache APIs
      selectOsuFolder: () => Promise<string | null>;
      scanOsuFolder: (folderPath: string, forceScan: boolean, scanAllMaps: boolean) => Promise<any>;
      getSongsCache: () => Promise<any>;
      saveSongsCache: (cache: any) => Promise<void>;
      
      // User Data APIs
      getUserData: () => Promise<any>;
      saveUserData: (data: any) => Promise<void>;
      
      // Window Control APIs
      windowMinimize: () => void;
      windowMaximize: () => void;
      appRestart: () => void;
      
      // Discord and Rich Presence APIs
      setDiscordRichPresence: (enabled: boolean, presenceData: any) => Promise<void>;
      
      // Widget Server APIs
      widgetStartServer: (port: number) => Promise<any>;
      widgetStopServer: () => Promise<void>;
      widgetIsRunning: () => Promise<boolean>;
      widgetGetUrl: () => Promise<string>;
      widgetUpdateNowPlaying: (data: any) => void;
      widgetSetVersion: (version: string) => Promise<any>;
      clearAllWidgets: () => Promise<{ success: boolean; message?: string; error?: string }>;
      
      // External APIs
      openExternal: (url: string) => Promise<void>;
      openPath: (path: string) => Promise<void>;
      
      // Profile Management APIs
      profileSave: (profileName: string, profileData: any) => Promise<any>;
      profileLoad: (profileName: string) => Promise<any>;
      profileDelete: (profileName: string) => Promise<any>;
      profileList: () => Promise<string[]>;
      
      // Event Listeners
      onScanProgress: (callback: (progress: any) => void) => void;
      removeScanProgressListener: () => void;
      onAppCloseRequested: (callback: (event: any) => void) => void;
      removeAppCloseRequestedListener: () => void;
    };
  }
}

export {};
