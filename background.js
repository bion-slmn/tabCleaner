import { readSettings } from "./settings.js";
import { discardTab, removeTabFromGroup, closeTab } from "./utils.js";
import { saveTabActiveTime, loadTabActiveTime } from "./utils.js";

// Global Constants
let INACTIVITY_TIME;
let MAX_TABS;
let INACTIVE_TAB_COLOR;
let EXTRA_TAB_COLOR;
let DAYS_TO_CLOSE = 2 * 24 * 60 * 60 * 1000;

// Usage of the imported function
readSettings()
  .then((results) => {
    console.log("Settings loaded successfully:");
    console.log("INACTIVITY_TIME:", results.INACTIVITY_TIME);
    console.log("MAX_TABS:", results.MAX_TABS);
    console.log("INACTIVE_TAB_COLOR:", results.INACTIVE_TAB_COLOR);
    console.log("EXTRA_TAB_COLOR:", results.EXTRA_TAB_COLOR);

    // Assign to global constants
    INACTIVITY_TIME = results.INACTIVITY_TIME;
    MAX_TABS = results.MAX_TABS;
    INACTIVE_TAB_COLOR = results.INACTIVE_TAB_COLOR;
    EXTRA_TAB_COLOR = results.EXTRA_TAB_COLOR;
  })
  .catch((error) => {
    console.error("Failed to load settings:", error);
  });

let tabActiveTime = {};

async function setCurrentTime() {
  tabActiveTime = await loadTabActiveTime(); // Wait for loading active time

  const currentTime = Date.now(); // Get the current time in milliseconds

  // Query all open tabs
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      // Check if the tab ID exists in the tabActiveTime object
      if (!(tab.id in tabActiveTime)) {
        tabActiveTime[tab.id] = currentTime;
      }
      console.log(
        `Tab ID: ${tab.id}, URL: ${tab.url}, Time Set: ${currentTime}`
      );
    });
  });
}

// Call this function to update the active time for all tabs
setCurrentTime();

const tabsToUnGroupFromInactiveTab = [];
const tabsToUnGroupFromExtraTab = [];

// Function to update the last active time for activated tabs
function handleTabActivated(activeInfo) {
  const tabId = activeInfo.tabId;
  const currentTime = Date.now();

  // Get the details of the activated tab
  chrome.tabs.get(tabId, (tab) => {
    // Update the last active time for the tab
    tabActiveTime[tabId] = currentTime;
    console.log(`Tab ${tab.url} is now active.`);

    // Check if the tab is in a group
    if (tab.groupId !== -1) {
      // Query for all tab groups to find "inActive Tabs" and "Extra tabs"
      chrome.tabGroups.query({}, (groups) => {
        groups.forEach((group) => {
          // If the group is "inActive Tabs" and the tab belongs to this group
          if (group.title === "inActive Tabs" && tab.groupId === group.id) {
            console.log(`Tab ${tab.url} is in "inActive Tabs", will ungroup.`);
            tabsToUnGroupFromInactiveTab.push(tabId);
          }
          // If the group is "Extra tabs" and the tab belongs to this group
          if (group.title === "Extra tabs" && tab.groupId === group.id) {
            console.log(`Tab ${tab.url} is in "Extra tabs", will ungroup.`);
            tabsToUnGroupFromExtraTab.push(tabId);
          }
        });
      });
    }
  });
}

// Function to update the last active time for updated tabs
function handleTabUpdated(tabId, changeInfo) {
  const currentTime = Date.now();
  tabActiveTime[tabId] = currentTime;
  console.log(`Tab ${tabId} is has been updated`);
}

function handleTooManyTabs(tabs) {
  if (tabs.length > MAX_TABS) {
    const currentTime = Date.now();

    // Filter inactive and ungrouped tabs, then sort by their last active time
    const extraTabs = tabs
      .filter((tab) => !tab.active && tab.groupId === -1)
      .sort((a, b) => tabActiveTime[a.id] - tabActiveTime[b.id]);

    // Log tab URLs and last active times (converted to seconds) for debugging

    // Determine which tabs to move to the "Extra Tabs" group
    const extraTabsToMove = extraTabs
      .slice(0, tabs.length - MAX_TABS)
      .map((tab) => tab.id);

    // Move the extra tabs to the "Extra Tabs" group if necessary
    if (extraTabsToMove.length > 0) {
      console.log('Moving tabs to "Extra Tabs"...');
      moveToGroup(
        extraTabsToMove,
        tabs[0].windowId,
        "Extra tabs",
        EXTRA_TAB_COLOR
      );
    }
  }
}

// Function to move a tab to the "Inactive Tabs" group
function moveToGroup(tabs, windowId, groupName, color) {
  // Query existing tab groups to find the one with the desired name
  chrome.tabGroups.query({ windowId: windowId }, (groups) => {
    let targetGroup = null;

    // Look for a group with the specified groupName in its title
    groups.forEach((group) => {
      if (group.title === groupName) {
        targetGroup = group;
      }
    });

    // If the group exists, move the tabs to it
    if (targetGroup) {
      console.log(
        `Moving tabs to existing group: ${groupName} (ID: ${targetGroup.id})`
      );
      chrome.tabs.group({ groupId: targetGroup.id, tabIds: tabs }, () => {
        console.log(`Tabs moved to existing '${groupName}' group.`);
      });
    } else {
      // If no group with the name exists, create a new one
      console.log(`Creating new group: ${groupName}...`);
      chrome.tabs.group(
        {
          createProperties: { windowId: windowId },
          tabIds: tabs,
        },
        (groupId) => {
          chrome.tabGroups.update(groupId, {
            title: groupName,
            color: color,
            collapsed: true,
          });
          console.log(
            `Created a new group: '${groupName}' with ID: ${groupId}.`
          );
        }
      );
    }

    tabs.forEach((tab) => {
      discardTab(tab);
    });
  });
}

// Listeners for when a tab is activated or updated
chrome.tabs.onActivated.addListener(handleTabActivated);
chrome.tabs.onUpdated.addListener(handleTabUpdated);
chrome.windows.onRemoved.addListener(() => {
  console.log(`Deleting a window ...`);
  saveTabActiveTime(tabActiveTime);
});
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  console.log(`Deleting tab ${tabId} ...`);
  delete tabActiveTime[tabId];
});
chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log(`i have heard changes in setting... ${changes}`);
  if (namespace === "sync") {
    if (changes.maxTabs) {
      MAX_TABS = changes.maxTabs.newValue;
    }
    if (changes.inactiveTabColor) {
      INACTIVE_TAB_COLOR = changes.inactiveTabColor.newValue;
    }
    if (changes.extraTabColor) {
      EXTRA_TAB_COLOR = changes.extraTabColor.newValue;
    }
    if (changes.inactivityTime) {
      INACTIVITY_TIME = changes.inactivityTime.newValue * 60 * 1000;
    }
  }
});

// Check periodically for inactive tabs and move them to the inactive group
setInterval(() => {
  const currentTime = Date.now();
  const tabsToGroup = [];
  const extraTabs = [];

  chrome.tabs.query({}, (tabs) => {
    console.log("Checking the tabs ..........");
    tabs.forEach((tab) => {
      const lastActive = tabActiveTime[tab.id] || currentTime;
      const sleepTime = currentTime - lastActive;

      // If the tab has been inactive and is not already in the inactive group
      if (!tab.active && sleepTime >= INACTIVITY_TIME && tab.groupId === -1) {
        console.log(tab.url, "going to sleep");
        tabsToGroup.push(tab.id);
      }
      if (!tab.active && sleepTime <= INACTIVITY_TIME && tab.groupId === -1) {
        extraTabs.push(tab);
      }

      if (tab.discarded && sleepTime > DAYS_TO_CLOSE) {
        console.log("Closing tab after 2 days.......");
        closeTab(tab.id);
      }
    });

    // Only attempt to move tabs if there are any to move
    if (tabsToGroup.length > 0) {
      moveToGroup(
        tabsToGroup,
        tabs[0].windowId,
        "inActive Tabs",
        INACTIVE_TAB_COLOR
      );
    }
    if (extraTabs.length > 0) {
      console.log(extraTabs.length, "Handling too many toabs");
      handleTooManyTabs(extraTabs);
    }

    // Ungroup tabs if there are any to ungroup
    if (tabsToUnGroupFromInactiveTab.length > 0) {
      removeTabFromGroup(tabsToUnGroupFromInactiveTab);
    }
    if (tabsToUnGroupFromExtraTab.length > 0) {
      removeTabFromGroup(tabsToUnGroupFromExtraTab);
    }
  });
}, 30 * 1000); // Check every 30 seconds
