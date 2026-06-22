import type { ProviderAvailability, ProviderAvailabilityState } from "./types";

export function availability(
  providerId: string,
  state: ProviderAvailabilityState,
  message?: string,
): ProviderAvailability {
  return message ? { providerId, state, message } : { providerId, state };
}

export function unsupported(
  providerId: string,
  message = "This capability is not supported in your browser.",
): ProviderAvailability {
  return availability(providerId, "unsupported", message);
}

export function requiresConfiguration(
  providerId: string,
  message = "Configuration is required before this provider can be used.",
): ProviderAvailability {
  return availability(providerId, "requires_configuration", message);
}

/** Pick the most usable provider from a list (available first). */
export function pickBestAvailability(
  items: ProviderAvailability[],
): ProviderAvailability | undefined {
  const rank: Record<ProviderAvailabilityState, number> = {
    available: 0,
    downloading: 1,
    downloadable: 2,
    requires_configuration: 3,
    unsupported: 4,
  };

  if (items.length === 0) return undefined;

  return [...items].sort((a, b) => rank[a.state] - rank[b.state])[0];
}

export function isUsable(state: ProviderAvailabilityState): boolean {
  return state === "available" || state === "downloading";
}
