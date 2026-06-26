import { pickBestAvailability } from "./availability";
import type {
  ImageDescriptionProvider,
  ReadAloudProvider,
  SummarizationProvider,
} from "./contracts";
import type { AICapability, ProviderAvailability } from "./types";

/** Free, local summarization — never BYOK / cloud (#28). */
export const LOCAL_SUMMARIZATION_PROVIDER_IDS = new Set([
  "chrome-summarizer",
  "unsupported-summarization",
]);

type CapabilityProviders = {
  summarization: SummarizationProvider[];
  imageDescription: ImageDescriptionProvider[];
  readAloud: ReadAloudProvider[];
};

export class ProviderRegistry {
  private readonly providers: CapabilityProviders = {
    summarization: [],
    imageDescription: [],
    readAloud: [],
  };

  registerSummarization(provider: SummarizationProvider): this {
    this.providers.summarization.push(provider);
    return this;
  }

  registerImageDescription(provider: ImageDescriptionProvider): this {
    this.providers.imageDescription.push(provider);
    return this;
  }

  registerReadAloud(provider: ReadAloudProvider): this {
    this.providers.readAloud.push(provider);
    return this;
  }

  getSummarizationProviders(): readonly SummarizationProvider[] {
    return this.providers.summarization;
  }

  getImageDescriptionProviders(): readonly ImageDescriptionProvider[] {
    return this.providers.imageDescription;
  }

  getReadAloudProviders(): readonly ReadAloudProvider[] {
    return this.providers.readAloud;
  }

  async listAvailability(
    capability: AICapability,
  ): Promise<ProviderAvailability[]> {
    const providers = this.providers[capability];
    return Promise.all(providers.map((provider) => provider.checkAvailability()));
  }

  async bestAvailability(
    capability: AICapability,
  ): Promise<ProviderAvailability | undefined> {
    const items = await this.listAvailability(capability);
    return pickBestAvailability(items);
  }

  /** Best availability among free local summarization providers (excludes BYOK). */
  async bestLocalSummarizationAvailability(): Promise<
    ProviderAvailability | undefined
  > {
    const items = await Promise.all(
      this.providers.summarization
        .filter((provider) =>
          LOCAL_SUMMARIZATION_PROVIDER_IDS.has(provider.id),
        )
        .map((provider) => provider.checkAvailability()),
    );
    return pickBestAvailability(items);
  }

  /** Primary summarization provider for the free tier (Chrome built-in or unsupported). */
  async getSummarizationProvider(): Promise<SummarizationProvider | undefined> {
    return this.pickBestProvider(
      this.providers.summarization.filter((provider) =>
        LOCAL_SUMMARIZATION_PROVIDER_IDS.has(provider.id),
      ),
    );
  }

  private async pickBestProvider<T extends { checkAvailability(): Promise<ProviderAvailability> }>(
    providers: readonly T[],
  ): Promise<T | undefined> {
    const items = await Promise.all(
      providers.map(async (provider) => ({
        provider,
        availability: await provider.checkAvailability(),
      })),
    );

    const ranked = [...items].sort(
      (a, b) =>
        rankAvailability(a.availability.state) -
        rankAvailability(b.availability.state),
    );

    return ranked[0]?.provider;
  }

  async getImageDescriptionProvider(): Promise<
    ImageDescriptionProvider | undefined
  > {
    return this.pickBestProvider(this.providers.imageDescription);
  }

  async getReadAloudProvider(): Promise<ReadAloudProvider | undefined> {
    return this.pickBestProvider(this.providers.readAloud);
  }
}

function rankAvailability(state: ProviderAvailability["state"]): number {
  switch (state) {
    case "available":
      return 0;
    case "downloading":
      return 1;
    case "downloadable":
      return 2;
    case "requires_configuration":
      return 3;
    case "unsupported":
      return 4;
    default:
      return 5;
  }
}
