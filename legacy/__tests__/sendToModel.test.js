import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import fs from "fs";
import path from "path";
import * as helpers from "../helpers/sendToModelHelpers.js";

// directory where results are saved
const outputDir = "./output";
const mockImagePath = path.resolve("screenshots", "screenshot_example.png");
const mockDomPath = path.resolve("screenshots", "serialized_example.json");

function cleanOutput() {
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
}

describe("sendToModel.js", () => {
  beforeAll(() => {
    cleanOutput();

    // mock screenshot and DOM files
    fs.mkdirSync("screenshots", { recursive: true });
    fs.writeFileSync(mockImagePath, "fakepngdata");
    fs.writeFileSync(mockDomPath, JSON.stringify({ tag: "BODY", text: "Hello" }));
  });

  afterAll(() => cleanOutput());

  it("builds valid messages and saves output JSON", async () => {
    // mock OpenAI client
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify([
              {
                type: "link",
                label: "Example",
                bounding_box: [10, 10, 100, 30],
                attributes: ["visible", "clickable"],
                source: "dom",
                dom_tag: "A",
              },
            ]),
          },
        },
      ],
    };

    // dynamically import the module after mocking
    vi.doMock("openai", () => {
      return {
        default: class MockOpenAI {
          constructor() {}
          chat = {
            completions: {
              create: vi.fn().mockResolvedValue(mockResponse),
            },
          };
        },
      };
    });

    const { sendToVisionModel } = await import("../scripts/sendToModel.js");

    // also mock helper functions to avoid hitting real API
    vi.spyOn(helpers, "buildMessages").mockImplementation(() => [
      { role: "system", content: "mock" },
    ]);
    vi.spyOn(helpers, "parseModelOutput").mockImplementation((content) =>
      JSON.parse(content)
    );

    const result = await sendToVisionModel(mockImagePath);

    // expect correct structure
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty("type", "link");
    expect(fs.existsSync(path.join(outputDir, "vision_output.json"))).toBe(true);
  });

  it("logs raw model response when DEBUG_MODEL_OUTPUT is true", async () => {
    process.env.DEBUG_MODEL_OUTPUT = "true";
    const { sendToVisionModel } = await import("../scripts/sendToModel.js");
    await sendToVisionModel(mockImagePath);
    const rawFile = path.join("output", "raw_model_response.txt");
    expect(fs.existsSync(rawFile)).toBe(true);
    process.env.DEBUG_MODEL_OUTPUT = "false";
  });


  it("throws an error if image path does not exist", async () => {
    const { sendToVisionModel } = await import("../scripts/sendToModel.js");
    await expect(sendToVisionModel("nope.png")).rejects.toThrow(/Image not found/);
  });

  it("throws an error if OPEN_AI_KEY missing", async () => {
    process.env.OPEN_AI_KEY = "";

    vi.resetModules(); // clears module cache
    const { sendToVisionModel } = await import("../scripts/sendToModel.js");
    await expect(sendToVisionModel(mockImagePath)).rejects.toThrow(/Missing OPEN_AI_KEY/);
  });
});
