// scripts/sendToModel.js
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { OPEN_AI_KEY } from "../constants/secrets.js"

const openai = new OpenAI({
  apiKey: OPEN_AI_KEY,
});

const OUTPUT_DIR = path.resolve("output");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "vision_output.json");

const MODEL = process.env.VISION_MODEL || "gpt-5-nano";

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

  try {
    const prompt = `
    Describe all visible user interface elements (buttons, links, text, fields, etc.)
    in structured JSON format:
    [
      {
        "type": "button" | "text" | "link" | "input" | "other",
        "label": "visible text or alt text if any",
        "bounding_box": [x, y, width, height],
        "attributes": ["clickable" | "disabled" | "hidden" | ...]
      }
    ]
    Return only valid JSON, no extra commentary.
    `;

    const base64Image = fs.readFileSync(imagePath, { encoding: "base64" });

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a vision model that converts webpage screenshots into structured JSON describing UI elements.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: `data:image/png;base64,${base64Image}` },
            }
          ],
        },
      ],
      // temperature: 0,
    });

    const rawOutput = response.choices[0]?.message?.content?.trim() || "";

    let parsed;
    try {
      parsed = JSON.parse(rawOutput);
    } catch {
      console.warn("⚠️ Model returned invalid JSON — saving raw output.");
      parsed = { raw: rawOutput };
    }

    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(parsed, null, 2));

    console.log(`✅ Vision output saved to ${OUTPUT_FILE}`);
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
