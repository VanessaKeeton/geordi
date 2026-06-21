import {
  extractPageText,
  extractSelectionText,
} from "../lib/content/extract";
import type { GeordiMessage } from "../lib/messages";

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  main() {
    chrome.runtime.onMessage.addListener(
      (
        message: GeordiMessage,
        _sender,
        sendResponse: (response: GeordiMessage) => void,
      ) => {
        try {
          if (message.type === "GET_PAGE_TEXT") {
            sendResponse({
              type: "PAGE_TEXT",
              text: extractPageText(),
              title: document.title,
            });
            return true;
          }

          if (message.type === "GET_SELECTION_TEXT") {
            sendResponse({
              type: "SELECTION_TEXT",
              text: extractSelectionText(),
            });
            return true;
          }
        } catch (err) {
          sendResponse({
            type: "ERROR",
            message: err instanceof Error ? err.message : "Failed to read page",
          });
          return true;
        }

        return false;
      },
    );
  },
});
