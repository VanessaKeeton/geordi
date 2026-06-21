import {
  clearWrappedReading,
  getWrappedReadingDocument,
  preparePageReading,
  prepareSelectionReading,
} from "../lib/content/prepare-reading";
import {
  clearReadingStyles,
  highlightAtCharIndex,
} from "../lib/content/wrap-for-reading";
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
          if (message.type === "GET_PAGE_READING") {
            const reading = preparePageReading();
            sendResponse({
              type: "PAGE_READING",
              text: reading.text,
              title: reading.title,
            });
            return true;
          }

          if (message.type === "GET_SELECTION_READING") {
            const reading = prepareSelectionReading();
            sendResponse({
              type: "SELECTION_READING",
              text: reading.text,
            });
            return true;
          }

          if (message.type === "HIGHLIGHT_AT_CHAR") {
            const doc = getWrappedReadingDocument();
            if (doc) {
              highlightAtCharIndex(doc, message.charIndex);
            }
            return false;
          }

          if (message.type === "CLEAR_HIGHLIGHT") {
            const doc = getWrappedReadingDocument();
            if (doc) {
              clearReadingStyles(doc);
            }
            return false;
          }

          if (message.type === "TEARDOWN_READING") {
            clearWrappedReading();
            return false;
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
