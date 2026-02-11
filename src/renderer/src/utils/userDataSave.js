export const scheduleSave = (options, partialData, delay = 2000, immediate = false) => {
  const { pendingSaveRef, saveTimerRef, saveUserData } = options || {};
  if (!pendingSaveRef || !saveTimerRef || !saveUserData) return;

  try {
    pendingSaveRef.current = { ...(pendingSaveRef.current || {}), ...partialData };

    if (immediate) {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (pendingSaveRef.current) {
        try {
          saveUserData(pendingSaveRef.current);
        } catch (e) {}
        pendingSaveRef.current = null;
      }
      return;
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        if (pendingSaveRef.current) {
          saveUserData(pendingSaveRef.current);
        }
      } catch (e) {}
      pendingSaveRef.current = null;
      saveTimerRef.current = null;
    }, delay);
  } catch (e) {}
};
