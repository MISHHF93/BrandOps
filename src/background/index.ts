import { RuntimeMessage } from '../services/messaging/messages';
import { storageService } from '../services/storage/storage';

chrome.runtime.onInstalled.addListener(async () => {
  await storageService.getData();
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  void (async () => {
    if (message.type === 'GET_DATA') {
      sendResponse(await storageService.getData());
      return;
    }

    if (message.type === 'RESET_DATA') {
      sendResponse(await storageService.resetToSeed());
      return;
    }

    if (message.type === 'OPEN_DASHBOARD') {
      await chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: message.type === 'PING' });
  })();

  return true;
});
