import {
  clearWrappedReading,
  getWrappedReadingDocument,
  preparePageReading,
  prepareSelectionReading,
} from "../lib/content/prepare-reading";
import {
  extractPageContent,
  extractSelectionContent,
} from "../lib/content/extract";
import {
  discoverPageImages,
  prepareImageDescriptionInput,
  resolvePageImageCandidate,
} from "../lib/content/page-images";
import { describePageImageInTab } from "../lib/content/describe-page-image-in-tab";
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

          if (message.type === "GET_PAGE_CONTENT") {
            sendResponse({
              type: "PAGE_CONTENT",
              content: extractPageContent(),
            });
            return true;
          }

          if (message.type === "GET_SELECTION_CONTENT") {
            sendResponse({
              type: "SELECTION_CONTENT",
              content: extractSelectionContent(),
            });
            return true;
          }

          if (message.type === "GET_PAGE_IMAGES") {
            sendResponse({
              type: "PAGE_IMAGES",
              discovery: discoverPageImages(),
            });
            return true;
          }

          if (message.type === "DESCRIBE_PAGE_IMAGE") {
            void (async () => {
              try {
                const result = await describePageImageInTab(
                  document,
                  message.candidateId,
                );
                sendResponse({
                  type: "IMAGE_DESCRIPTION_RESULT",
                  description: result.description,
                  label: result.label,
                  providerId: result.providerId,
                });
              } catch (err) {
                sendResponse({
                  type: "ERROR",
                  message:
                    err instanceof Error
                      ? err.message
                      : "Could not describe this image.",
                });
              }
            })();
            return true;
          }

          if (message.type === "GET_IMAGE_DESCRIPTION_INPUT") {
            void (async () => {
              try {
                const candidate = resolvePageImageCandidate(
                  document,
                  message.candidateId,
                );
                if (!candidate) {
                  sendResponse({
                    type: "ERROR",
                    message: "Selected image was not found on this page.",
                  });
                  return;
                }

                sendResponse({
                  type: "IMAGE_DESCRIPTION_INPUT",
                  input: await prepareImageDescriptionInput(document, candidate),
                });
              } catch (err) {
                sendResponse({
                  type: "ERROR",
                  message:
                    err instanceof Error
                      ? err.message
                      : "Could not prepare image for description.",
                });
              }
            })();
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
