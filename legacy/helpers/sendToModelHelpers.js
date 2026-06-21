// helpers/sendToModelHelpers.js
export function buildMessages({ base64Image, domContent, prompt }) {
  return [
    {
      role: "system",
      content:
        "You are a multimodal model that merges webpage DOM and screenshot information to identify visible UI elements.",
    },
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        ...(domContent ? [{ type: "text", text: `DOM Snapshot:\n${domContent}` }] : []),
        { type: "image_url", image_url: { url: `data:image/png;base64,${base64Image}` } },
      ],
    },
  ];
}

export function parseModelOutput(rawOutput) {
  try {
    return JSON.parse(rawOutput);
  } catch {
    console.warn("⚠️ Model returned invalid JSON — saving raw output.");
    return { raw: rawOutput };
  }
}
