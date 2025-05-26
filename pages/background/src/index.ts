// Initialize background script
console.log('[Katakana Translator] Background script initialized');

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'LOG') {
    console.log('[Katakana Translator]', message.data);
  }
  // Always send a response
  sendResponse({ success: true });
  return true;
});
