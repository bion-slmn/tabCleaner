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

export function saveTabActiveTime(tabActiveTime) {
  chrome.storage.local.set({ tabActiveTime }, () => {
    if (chrome.runtime.lastError) {
      console.error("Error saving tab active time:", chrome.runtime.lastError);
    } else {
      console.log("Saving active time Sucecess............");
    }
  });
}

// Function to load the state of tabActiveTime from storage
export function loadTabActiveTime() {
  return new Promise((resolve) => {
    chrome.storage.local.get("tabActiveTime", (result) => {
      let loadedTabActiveTime;
      if (result.tabActiveTime) {
        loadedTabActiveTime = result.tabActiveTime;
      } else {
        loadedTabActiveTime = {}; // Initialize if not found
      }
      console.log("Retrieved active tab:", loadedTabActiveTime);
      resolve(loadedTabActiveTime); // Resolve the promise with the loaded data
    });
  });
}

export function closeTab(tabId) {
  chrome.tabs.remove(tabId, function () {
    if (chrome.runtime.lastError) {
      console.error("Failed to remove tab:", chrome.runtime.lastError);
    } else {
      console.log("Tab", tabId, "successfully closed.");
    }
  });
}
