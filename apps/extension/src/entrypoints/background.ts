import type { GeordiMessage, GeordiTabMessage } from "../lib/messages";
import { fetchPageImageInBackground } from "../lib/content/fetch-page-image";

const TAB_MESSAGES = new Set<GeordiTabMessage["type"]>([
  "GET_PAGE_READING",
  "GET_SELECTION_READING",
  "GET_PAGE_CONTENT",
  "GET_SELECTION_CONTENT",
  "GET_PAGE_IMAGES",
  "DESCRIBE_PAGE_IMAGE",
  "HIGHLIGHT_AT_CHAR",
  "CLEAR_HIGHLIGHT",
  "HIGHLIGHT_PAGE_IMAGE",
  "CLEAR_PAGE_IMAGE",
  "TEARDOWN_READING",
]);

const REQUEST_MESSAGES = new Set<GeordiTabMessage["type"]>([
  "GET_PAGE_READING",
  "GET_SELECTION_READING",
  "GET_PAGE_CONTENT",
  "GET_SELECTION_CONTENT",
  "GET_PAGE_IMAGES",
  "DESCRIBE_PAGE_IMAGE",
]);

/** Tab that initiated the current reading session (highlights must target this tab). */
let readingTabId: number | null = null;

/** Tab where page images were last discovered or described. */
let pageImagesTabId: number | null = null;

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

  return lastFocusedTabId ?? pageImagesTabId ?? readingTabId ?? undefined;
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
      if (pageImagesTabId === tabId) {
        pageImagesTabId = null;
      }
    }
  });

  chrome.runtime.onMessage.addListener(
    (
      message: GeordiMessage,
      sender,
      sendResponse: (response: GeordiMessage) => void,
    ) => {
      if (message.type === "FETCH_PAGE_IMAGE") {
        void (async () => {
          try {
            const imageDataUrl = await fetchPageImageInBackground(message.imageUrl);
            sendResponse({ type: "PAGE_IMAGE_DATA", imageDataUrl });
          } catch (error) {
            sendResponse({
              type: "ERROR",
              message:
                error instanceof Error
                  ? error.message
                  : "Could not fetch page image.",
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
          const targetTabId =
            pageImagesTabId ?? readingTabId ?? (await getActiveTabId());
          if (!targetTabId) return;
          chrome.tabs.sendMessage(targetTabId, message, () => {
            void chrome.runtime.lastError;
          });
          return;
        }

        const tabId = sender.tab?.id ?? (await getActiveTabId());
        if (!tabId) {
          sendResponse({ type: "ERROR", message: "No active tab" });
          return;
        }

        if (
          message.type === "GET_PAGE_IMAGES" ||
          message.type === "DESCRIBE_PAGE_IMAGE"
        ) {
          pageImagesTabId = tabId;
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
