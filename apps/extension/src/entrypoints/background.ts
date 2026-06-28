import type { GeordiMessage, GeordiTabMessage } from "../lib/messages";
import { fetchSameOriginImageInBackground } from "../lib/content/fetch-same-origin-image";

const TAB_MESSAGES = new Set<GeordiTabMessage["type"]>([
  "GET_PAGE_READING",
  "GET_SELECTION_READING",
  "GET_PAGE_CONTENT",
  "GET_SELECTION_CONTENT",
  "GET_PAGE_IMAGES",
  "DESCRIBE_PAGE_IMAGE",
  "GET_IMAGE_DESCRIPTION_INPUT",
  "HIGHLIGHT_AT_CHAR",
  "CLEAR_HIGHLIGHT",
  "TEARDOWN_READING",
]);

const REQUEST_MESSAGES = new Set<GeordiTabMessage["type"]>([
  "GET_PAGE_READING",
  "GET_SELECTION_READING",
  "GET_PAGE_CONTENT",
  "GET_SELECTION_CONTENT",
  "GET_PAGE_IMAGES",
  "DESCRIBE_PAGE_IMAGE",
  "GET_IMAGE_DESCRIPTION_INPUT",
]);

/** Tab that initiated the current reading session (highlights must target this tab). */
let readingTabId: number | null = null;

/** Last tab the user focused in a normal browser window (side panel / devtools fallback). */
let lastFocusedTabId: number | null = null;

function rememberFocusedTab(tabId: number, url?: string): void {
  if (url?.startsWith("chrome://") || url?.startsWith("chrome-extension://")) {
    return;
  }
  lastFocusedTabId = tabId;
}

function resetReadingOnTabNavigation(tabId: number): void {
  if (readingTabId === null || tabId !== readingTabId) return;
  readingTabId = null;
  chrome.runtime.sendMessage({ type: "RESET_READING" }).catch(() => {
    // Side panel may be closed; speech stops when the panel unloads.
  });
}

async function getActiveTabId(): Promise<number | undefined> {
  const [current] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (current?.id !== undefined) return current.id;

  const [lastFocused] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  if (lastFocused?.id !== undefined) return lastFocused.id;

  return lastFocusedTabId ?? readingTabId ?? undefined;
}

export default defineBackground(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {
    // Side panel API may be unavailable in older Chrome versions during dev.
  });

  chrome.commands.onCommand.addListener(async (command, tab) => {
    if (command !== "open-side-panel" || !tab?.windowId) return;
    if (tab.id !== undefined) rememberFocusedTab(tab.id, tab.url);
    await chrome.sidePanel.open({ windowId: tab.windowId });
  });

  chrome.tabs.onActivated.addListener(({ tabId }) => {
    void chrome.tabs.get(tabId).then((tab) => {
      rememberFocusedTab(tabId, tab.url);
    });
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.active) rememberFocusedTab(tabId, tab.url ?? changeInfo.url);
    if (changeInfo.status === "loading" || changeInfo.url) {
      resetReadingOnTabNavigation(tabId);
    }
  });

  chrome.runtime.onMessage.addListener(
    (
      message: GeordiMessage,
      sender,
      sendResponse: (response: GeordiMessage) => void,
    ) => {
      if (message.type === "FETCH_SAME_ORIGIN_IMAGE") {
        void (async () => {
          try {
            const imageDataUrl = await fetchSameOriginImageInBackground(
              message.imageUrl,
              message.pageUrl,
            );
            sendResponse({ type: "SAME_ORIGIN_IMAGE_DATA", imageDataUrl });
          } catch (error) {
            sendResponse({
              type: "ERROR",
              message:
                error instanceof Error
                  ? error.message
                  : "Could not fetch same-origin image.",
            });
          }
        })();
        return true;
      }

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
