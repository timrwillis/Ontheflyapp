// Capture the platform-native fetch BEFORE the expo/fetch polyfill runs.
// This file MUST have zero imports and MUST be imported in index.ts BEFORE
// ./utils/polyfills/fetch so that `globalThis.fetch` here is still the
// real native fetch, not the polyfilled one.
export const nativeFetch: typeof fetch = (globalThis as any).fetch?.bind(globalThis);
