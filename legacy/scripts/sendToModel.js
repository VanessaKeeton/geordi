// scripts/sendToModel.js
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { OPEN_AI_KEY } from "../constants/secrets.js"
import { buildMessages, parseModelOutput } from "../helpers/sendToModelHelpers.js";

const openai = new OpenAI({
  apiKey: OPEN_AI_KEY,
});

const OUTPUT_DIR = path.resolve("output");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "vision_output.json");

const MODEL = process.env.VISION_MODEL || "gpt-5-mini";

/**
 * Send an image to a vision model and return structured JSON.
 * @param {string} imagePath - Path to the image file.
 */
export async function sendToVisionModel(imagePath) {
  if (!OPEN_AI_KEY) {
    throw new Error("Missing OPEN_AI_KEY in environment variables");
  }

  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image not found at path: ${imagePath}`);
  }

  // derive matching JSON path
  const domFilePath = imagePath.replace("screenshot_", "serialized_").replace(".png", ".json");
  let domContent = null;

  if (fs.existsSync(domFilePath)) {
    console.log(`📄 Including DOM snapshot: ${domFilePath}`);
    domContent = fs.readFileSync(domFilePath, "utf-8");
  } else {
    console.warn("⚠️ No DOM JSON found for this image — continuing with vision only.");
  }

  try {
    const prompt = `
    You are analyzing a webpage using two inputs:
    1. A DOM snapshot (JSON describing element hierarchy, text, and attributes).
    2. A screenshot image of the same page.

    Your job:
    - Combine DOM structure with the visual image to identify visible interface elements.
    - Correctly infer semantic roles:
       • If something looks like a button or link but the DOM shows <div> with onClick → type: "button" or "link".
       • If something is invisible or off-screen → ignore it.
    - Use DOM text for accuracy, but verify visually that it is rendered.

    Output strictly JSON:
    [
      {
        "type": "button" | "link" | "input" | "heading" | "paragraph" | "image" | "other",
        "label": "exact visible text from DOM or image",
        "bounding_box": [x, y, width, height],
        "attributes": ["visible", "clickable", ...],
        "source": "dom" | "vision" | "merged",
        "dom_tag": "the original HTML tag name if known"
      }
    ]

    Rules:
    - No commentary or markdown.
    - Do not summarize or fabricate text.
    - Use both sources to infer meaning accurately.
    `;


    const base64Image = fs.readFileSync(imagePath, { encoding: "base64" });

    const messages = buildMessages({base64Image, domContent, prompt});


    const response = await openai.chat.completions.create({
      model: MODEL,
      messages,
    });

    const rawOutput = response?.choices?.[0]?.message?.content?.trim() || "";

    const parsed = parseModelOutput(rawOutput);

    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(parsed, null, 2));

    console.log(`✅ Vision output saved to ${OUTPUT_FILE}`);

    // 🪵 Debug logging
    if (process.env.DEBUG_MODEL_OUTPUT === "true") {
      const debugOutputPath = path.join(OUTPUT_DIR, "raw_model_response.txt");
      let raw;

      try {
        raw = JSON.stringify(response ?? { message: "No response object" }, null, 2);
      } catch (err) {
        raw = `Failed to stringify response: ${err.message}`;
      }

      fs.writeFileSync(debugOutputPath, raw);
      console.log(`🪵 Raw model response logged to ${debugOutputPath}`);
    }

    return parsed;
  } catch (err) {
    console.error("❌ Error sending image to vision model:", err.message);
    throw err;
  }
}

// CLI entry point: `pnpm geordi:send screenshots/example.png`
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const imagePath = process.argv[2];
  if (!imagePath) {
    console.error("Usage: pnpm geordi:send <imagePath>");
    process.exit(1);
  }
  sendToVisionModel(imagePath);
}
