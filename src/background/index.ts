import { storageService } from '../services/storage/storage';
import { RuntimeMessage } from '../services/messaging/messages';

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await storageService.getData();
  await storageService.setData(existing);
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  void (async () => {
    if (message.type === 'GET_DATA') {
      sendResponse(await storageService.getData());
      return;
    }

    if (message.type === 'RESET_DATA') {
      await storageService.reset();
      sendResponse({ ok: true });
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
