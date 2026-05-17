// The background service worker

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "open-json-viewer",
    title: "Open in JSON Query Tool",
    contexts: ["selection", "page", "link"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "open-json-viewer" && tab?.id) {
    // Send a message to the content script in the current tab to extract the data
    chrome.tabs.sendMessage(tab.id, { action: "EXTRACT_JSON" });
  }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({ url: chrome.runtime.getURL("index.html") });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "OPEN_VIEWER_WITH_DATA") {
    // Save data to storage then open the viewer tab
    chrome.storage.local.set({ jsonViewerData: message.data, isLiveUpdate: message.isLiveUpdate, sourceTabId: sender.tab?.id }, () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("index.html?source=external") });
    });
  } else if (message.action === "LIVE_UPDATE_DATA") {
    // Data has updated, store it and notify any open viewer tabs
    chrome.storage.local.set({ jsonViewerData: message.data }, () => {
      // Find all viewer tabs and notify them
      chrome.tabs.query({ url: chrome.runtime.getURL("index.html") }, (tabs) => {
        tabs.forEach(tab => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { action: "REFRESH_DATA" });
          }
        });
      });
    });
  }
});
