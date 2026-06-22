/**
 * Thin WebExtension runtime shim.
 * Feature code should use this instead of importing `chrome` or `browser` directly.
 */

export interface ExtensionStorageArea {
  get(
    keys?: string | string[] | Record<string, unknown> | null,
  ): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

export interface ExtensionRuntime {
  storage?: {
    local?: ExtensionStorageArea;
  };
  runtime?: {
    getURL(path: string): string;
    id?: string;
  };
}

type GlobalWithExtension = typeof globalThis & {
  chrome?: ExtensionRuntime;
  browser?: ExtensionRuntime;
};

/** Returns the active extension runtime (`chrome.*` or promisified `browser.*`). */
export function getExtensionRuntime(): ExtensionRuntime | undefined {
  const global = globalThis as GlobalWithExtension;
  if (global.chrome?.storage?.local) return global.chrome;
  if (global.browser?.storage?.local) return global.browser;
  return undefined;
}

/** Whether any WebExtension runtime is present (extension context or test mock). */
export function hasExtensionRuntime(): boolean {
  return getExtensionRuntime() !== undefined;
}
