import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setTimeout as delay } from "timers/promises";
import fs from "fs";
import path from "path";

const saveDir = "./screenshots";
const localTestPage = `file://${path.resolve("tests/sample.html")}`;


function cleanScreenshots() {
  if (fs.existsSync(saveDir)) {
    fs.rmSync(saveDir, { recursive: true, force: true });
  }
  fs.mkdirSync(saveDir, { recursive: true }); // ensure folder always exists for next run
}

describe("capture.js", () => {
  beforeAll(() => cleanScreenshots());
  afterAll(() => cleanScreenshots());

  it("creates screenshots directory if it does not exist", async () => {
    const { execSync } = await import("child_process");
    execSync(`node scripts/capture.js "${localTestPage}"`, { stdio: "ignore" });
    expect(fs.existsSync(saveDir)).toBe(true);
  });

  it("produces screenshot and serialized DOM files", async () => {
    await delay(200); // wait for file I/O to settle
    const files = fs.readdirSync(saveDir);
    const hasScreenshot = files.some(f => f.endsWith(".png"));
    const hasSerialized = files.some(f => f.endsWith(".json"));
    expect(hasScreenshot && hasSerialized).toBe(true);
  });

  it("serialized DOM file contains visible or interactive content", () => {
    const jsonFile = fs.readdirSync(saveDir).find(f => f.endsWith(".json"));
    const dom = JSON.parse(fs.readFileSync(path.join(saveDir, jsonFile), "utf8"));
    const text = JSON.stringify(dom);
    const hasContent = /(button|input|a|link|h1|h2|p|nav|img|text":\s*"[A-Za-z0-9])/i.test(text);
    expect(hasContent).toBe(true);
  });

  it("exits gracefully with invalid URL", async () => {
    const { spawnSync } = await import("child_process");
    const result = spawnSync("node", ["scripts/capture.js", "not-a-real-url"]);
    expect(result.status).toBe(1);
    expect(result.stderr.toString()).toContain("Invalid URL");
  });

  it("exits gracefully with missing URL", async () => {
    const { spawnSync } = await import("child_process");
    const result = spawnSync("node", ["scripts/capture.js"]);
    expect(result.status).toBe(1);
    expect(result.stderr.toString()).toContain("Please provide a URL");
  });
});
