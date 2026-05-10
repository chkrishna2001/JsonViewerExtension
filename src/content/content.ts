// The content script

let lastRightClickedElement: HTMLElement | null = null;
let currentObserver: MutationObserver | null = null;

// Track the element that was right-clicked
document.addEventListener('contextmenu', (event) => {
  lastRightClickedElement = event.target as HTMLElement;
}, true);

// Utility to attempt JSON parse
function tryParseJSON(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch (e) {
    return false;
  }
}

// Traverse upwards to find a container with valid JSON
function findJsonContainer(element: HTMLElement): { element: HTMLElement, data: string } | null {
  let current: HTMLElement | null = element;
  
  while (current && current !== document.body) {
    const text = current.textContent || current.innerText;
    if (text && text.trim().startsWith('{') || text.trim().startsWith('[')) {
      if (tryParseJSON(text)) {
        return { element: current, data: text };
      }
    }
    current = current.parentElement;
  }
  return null;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "EXTRACT_JSON") {
    let extractedData = "";
    let isLiveUpdate = false;
    
    // 1. Try selected text first
    const selection = window.getSelection()?.toString();
    if (selection && tryParseJSON(selection)) {
      extractedData = selection;
    } 
    // 2. Try the right-clicked element and traverse up
    else if (lastRightClickedElement) {
      const result = findJsonContainer(lastRightClickedElement);
      if (result) {
        extractedData = result.data;
        isLiveUpdate = true;
        
        // Setup Mutation Observer
        if (currentObserver) currentObserver.disconnect();
        
        currentObserver = new MutationObserver(() => {
          const newData = result.element.textContent || result.element.innerText;
          if (tryParseJSON(newData)) {
            chrome.runtime.sendMessage({ action: "LIVE_UPDATE_DATA", data: newData });
          }
        });
        
        currentObserver.observe(result.element, { childList: true, subtree: true, characterData: true });
      } else {
        // Fallback to full page text
        const bodyText = document.body.textContent || document.body.innerText;
        if (tryParseJSON(bodyText)) {
          extractedData = bodyText;
        }
      }
    }
    
    if (extractedData) {
      chrome.runtime.sendMessage({ 
        action: "OPEN_VIEWER_WITH_DATA", 
        data: extractedData,
        isLiveUpdate 
      });
    } else {
      alert("Could not find valid JSON to open.");
    }
  }
});

// Auto-detect if navigating to a raw .json file URL
if (document.contentType === "application/json" || document.location.pathname.endsWith('.json')) {
  const bodyText = document.body.textContent || document.body.innerText;
  if (tryParseJSON(bodyText)) {
    chrome.runtime.sendMessage({ 
      action: "OPEN_VIEWER_WITH_DATA", 
      data: bodyText,
      isLiveUpdate: false 
    });
  }
}
