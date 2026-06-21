/** Stub for future BYOK / paid AI features. Core reading requires no network. */
export interface PageContext {
  title: string;
  text: string;
  url: string;
}

export interface NavAction {
  selector: string;
  description: string;
}

export interface AIProvider {
  summarize(text: string): Promise<string>;
  navigate(instruction: string, pageContext: PageContext): Promise<NavAction>;
}

export class UnconfiguredAIProvider implements AIProvider {
  async summarize(): Promise<string> {
    throw new Error("AI features require an API key. Coming in Phase 3.");
  }

  async navigate(): Promise<NavAction> {
    throw new Error("AI navigation requires an API key. Coming in Phase 3.");
  }
}
