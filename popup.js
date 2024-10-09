document.addEventListener('DOMContentLoaded', () => {
  // Event listener for the save button
  document.getElementById('saveButton').addEventListener('click', saveSettings);

  // Load the settings when the popup opens
  loadSettings();
});

function saveSettings() {
  const maxTabs = parseInt(document.getElementById('maxTabs').value);
  const inactiveTabColor = document.getElementById('inactiveTabColor').value;
  const extraTabColor = document.getElementById('extraTabColor').value;
  const inactivityTime = parseInt(document.getElementById('inactivityTime').value);

  chrome.storage.sync.set({
      maxTabs: maxTabs,
      inactiveTabColor: inactiveTabColor,
      extraTabColor: extraTabColor,
      inactivityTime: inactivityTime
  }, () => {
      // Notify the user that the settings were saved
      const status = document.getElementById('status');
      status.textContent = 'Settings saved successfully.';
      
      // Close the popup after saving
      setTimeout(() => {
          status.textContent = '';
          window.close();
      }, 1000);  // Close after 1 second
  });
}

function loadSettings() {
  chrome.storage.sync.get(['maxTabs', 'inactiveTabColor', 'extraTabColor', 'inactivityTime'], (result) => {
      document.getElementById('maxTabs').value = result.maxTabs || 10;
      document.getElementById('inactiveTabColor').value = result.inactiveTabColor || 'grey';
      document.getElementById('extraTabColor').value = result.extraTabColor || 'blue';
      document.getElementById('inactivityTime').value = result.inactivityTime || 5;
  });
}
