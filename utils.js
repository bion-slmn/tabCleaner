export function removeTabFromGroup(tabIds) {
  if (Array.isArray(tabIds) && tabIds.length > 0) {
    // Use the chrome.tabs.ungroup API to remove the tabs from their groups
    console.log("Removing tabs from group...");

    chrome.tabs.ungroup(tabIds, () => {
      console.log(`Ungrouping tabs: ${tabIds.join(", ")}`);
    });
    tabIds.length = 0;
    console.log("Tab IDs array cleared.");
  } else {
    console.log("No tab IDs provided or invalid input.");
  }
}

export function discardTab(tabId) {
  chrome.tabs.get(tabId, (tab) => {
    // Check if the tab is discardable
    if (!tab.audible && !tab.active && !tab.pendingUrl && !tab.discarded) {
      chrome.tabs.discard(tabId, () => {
        if (chrome.runtime.lastError) {
          console.error(
            `Error discarding tab ${tabId}: ${chrome.runtime.lastError.message}`
          );
        } else {
          console.log(`Tab ${tabId} has been discarded.`);
        }
      });
    } else {
      console.log(
        `Tab ${tabId} cannot be discarded. It may be playing audio/video, downloading, or active.`
      );
    }
  });
}
