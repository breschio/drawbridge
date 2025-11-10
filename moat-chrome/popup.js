// Moat Chrome Extension - Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Automatically open Moat sidebar when popup is opened
  console.log('Popup: Auto-opening Moat sidebar');
  chrome.tabs.sendMessage(tab.id, { action: 'toggleMoat' }, (response) => {
    console.log('Popup: Moat sidebar opened:', response);
    // Close popup immediately after triggering sidebar
    window.close();
  });
}); 