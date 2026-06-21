import type { GeordiMessage } from "../lib/messages";

async function getActiveTabId(): Promise<number | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

export default defineBackground(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {
    // Side panel API may be unavailable in older Chrome versions during dev.
  });

  chrome.commands.onCommand.addListener(async (command, tab) => {
    if (command !== "open-side-panel" || !tab?.windowId) return;
    await chrome.sidePanel.open({ windowId: tab.windowId });
  });

  chrome.runtime.onMessage.addListener(
    (
      message: GeordiMessage,
      sender,
      sendResponse: (response: GeordiMessage) => void,
    ) => {
      if (message.type !== "GET_PAGE_TEXT" && message.type !== "GET_SELECTION_TEXT") {
        return false;
      }

      void (async () => {
        const tabId = sender.tab?.id ?? (await getActiveTabId());
        if (!tabId) {
          sendResponse({ type: "ERROR", message: "No active tab" });
          return;
        }

        chrome.tabs.sendMessage(tabId, message, (response: GeordiMessage) => {
          if (chrome.runtime.lastError) {
            sendResponse({
              type: "ERROR",
              message: chrome.runtime.lastError.message ?? "Content script unavailable",
            });
            return;
          }
          sendResponse(response);
        });
      })();

      return true;
    },
  );
});
