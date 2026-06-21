import type { GeordiMessage, GeordiTabMessage } from "../lib/messages";

const TAB_MESSAGES = new Set<GeordiTabMessage["type"]>([
  "GET_PAGE_READING",
  "GET_SELECTION_READING",
  "HIGHLIGHT_AT_CHAR",
  "CLEAR_HIGHLIGHT",
  "TEARDOWN_READING",
]);

const REQUEST_MESSAGES = new Set<GeordiTabMessage["type"]>([
  "GET_PAGE_READING",
  "GET_SELECTION_READING",
]);

/** Tab that initiated the current reading session (highlights must target this tab). */
let readingTabId: number | null = null;

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
      if (!TAB_MESSAGES.has(message.type as GeordiTabMessage["type"])) {
        return false;
      }

      void (async () => {
        if (message.type === "TEARDOWN_READING") {
          readingTabId = null;
        }

        if (!REQUEST_MESSAGES.has(message.type as GeordiTabMessage["type"])) {
          const targetTabId = readingTabId ?? (await getActiveTabId());
          if (!targetTabId) return;
          chrome.tabs.sendMessage(targetTabId, message);
          return;
        }

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

          if (
            response.type === "PAGE_READING" ||
            response.type === "SELECTION_READING"
          ) {
            readingTabId = tabId;
          }

          sendResponse(response);
        });
      })();

      return REQUEST_MESSAGES.has(message.type as GeordiTabMessage["type"]);
    },
  );
});
