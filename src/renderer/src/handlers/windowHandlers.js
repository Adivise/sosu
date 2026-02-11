export const createCloseRequestHandler = ({
  askBeforeClose,
  closeToTray,
  setShowCloseConfirmDialog,
  electronAPI
}) => {
  return () => {
    if (askBeforeClose) {
      setShowCloseConfirmDialog(true);
      return;
    }

    if (!electronAPI) return;
    if (closeToTray) {
      electronAPI.appMinimizeToTray();
    } else {
      electronAPI.appQuit();
    }
  };
};

export const handleCloseConfirmMinimize = ({
  dontAskAgain,
  setAskBeforeClose,
  setCloseToTray,
  setShowCloseConfirmDialog,
  electronAPI
}) => {
  if (dontAskAgain) {
    setAskBeforeClose(false);
    setCloseToTray(true);
  }
  setShowCloseConfirmDialog(false);
  if (electronAPI) {
    electronAPI.appMinimizeToTray();
  }
};

export const handleCloseConfirmQuit = ({
  dontAskAgain,
  setAskBeforeClose,
  setCloseToTray,
  setShowCloseConfirmDialog,
  electronAPI
}) => {
  if (dontAskAgain) {
    setAskBeforeClose(false);
    setCloseToTray(false);
  }
  setShowCloseConfirmDialog(false);
  if (electronAPI) {
    electronAPI.appQuit();
  }
};

export const handleCloseConfirmCancel = ({ setShowCloseConfirmDialog }) => {
  setShowCloseConfirmDialog(false);
};
