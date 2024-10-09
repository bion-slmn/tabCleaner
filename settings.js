export async function readSettings() {
  try {
    const settings = await chrome.storage.sync.get([
      "maxTabs",
      "inactiveTabColor",
      "extraTabColor",
      "inactivityTime",
    ]);

    const { maxTabs, inactiveTabColor, extraTabColor, inactivityTime } =
      settings;

    const INACTIVITY_TIME_LOCAL = (inactivityTime || 15) * 60 * 1000; // Default to 5 minutes
    const MAX_TABS_LOCAL = maxTabs || 20; // Default value
    const INACTIVE_TAB_COLOR_LOCAL = inactiveTabColor || "grey";
    const EXTRA_TAB_COLOR_LOCAL = extraTabColor || "blue";

    return {
      INACTIVITY_TIME: INACTIVITY_TIME_LOCAL,
      MAX_TABS: MAX_TABS_LOCAL,
      INACTIVE_TAB_COLOR: INACTIVE_TAB_COLOR_LOCAL,
      EXTRA_TAB_COLOR: EXTRA_TAB_COLOR_LOCAL,
    };
  } catch (error) {
    console.error("Error reading settings:", error);
    throw error;
  }
}
