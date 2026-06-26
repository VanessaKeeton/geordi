import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  renderSummaryDisplay,
  shouldRenderSummaryList,
  splitSummaryBulletItems,
} from "./summary-display";

describe("splitSummaryBulletItems", () => {
  it("splits inline asterisk bullets from Chrome key-points output", () => {
    const text =
      "The summarizer checks API availability. * Summaries are generated on-device. * No page content is sent remotely.";

    expect(splitSummaryBulletItems(text)).toEqual([
      "The summarizer checks API availability.",
      "Summaries are generated on-device.",
      "No page content is sent remotely.",
    ]);
  });

  it("splits line-based markdown bullets", () => {
    const text = "- First point.\n- Second point.\n- Third point.";

    expect(splitSummaryBulletItems(text)).toEqual([
      "First point.",
      "Second point.",
      "Third point.",
    ]);
  });

  it("returns a single item for paragraph text", () => {
    const text = "One concise paragraph without bullets.";

    expect(splitSummaryBulletItems(text)).toEqual([text]);
  });
});

describe("renderSummaryDisplay", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = "";
    container = document.createElement("div");
    document.body.append(container);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders bullet summaries as a list", () => {
    renderSummaryDisplay(
      container,
      "First idea. * Second idea. * Third idea.",
      "bullets",
    );

    const items = [...container.querySelectorAll(".summary-list li")];
    expect(items).toHaveLength(3);
    expect(items[0]?.textContent).toBe("First idea.");
    expect(items[1]?.textContent).toBe("Second idea.");
  });

  it("renders paragraph summaries as plain text", () => {
    renderSummaryDisplay(
      container,
      "One flowing paragraph summary.",
      "paragraph",
    );

    expect(container.querySelector("ul")).toBeNull();
    expect(container.textContent).toBe("One flowing paragraph summary.");
  });

  it("uses list layout for takeaways when multiple points are present", () => {
    expect(
      shouldRenderSummaryList("takeaways", "Alpha. * Beta."),
    ).toBe(true);
  });
});
