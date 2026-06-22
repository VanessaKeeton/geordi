import { pickBestAvailability } from "./availability";
import type {
  ImageDescriptionProvider,
  ReadAloudProvider,
  SummarizationProvider,
} from "./contracts";
import type { AICapability, ProviderAvailability } from "./types";

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

  async getSummarizationProvider(): Promise<SummarizationProvider | undefined> {
    const items = await Promise.all(
      this.providers.summarization.map(async (provider) => ({
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
    const items = await Promise.all(
      this.providers.imageDescription.map(async (provider) => ({
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

  async getReadAloudProvider(): Promise<ReadAloudProvider | undefined> {
    const items = await Promise.all(
      this.providers.readAloud.map(async (provider) => ({
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
