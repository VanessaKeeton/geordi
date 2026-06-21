import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: "src",
  outDir: ".output",
  manifest: {
    name: "Geordi",
    description: "Accessibility toolkit — read, navigate, and understand the web",
    permissions: ["activeTab", "sidePanel", "storage", "scripting"],
    host_permissions: ["<all_urls>"],
    action: {
      default_title: "Open Geordi",
    },
    commands: {
      "open-side-panel": {
        suggested_key: {
          default: "Alt+Shift+G",
          mac: "Alt+Shift+G",
        },
        description: "Open Geordi side panel",
      },
    },
  },
});
