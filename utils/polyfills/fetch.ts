import { fetch as expoFetch } from 'expo/fetch';

// Replace global fetch with expo/fetch which supports streaming response bodies
global.fetch = expoFetch as unknown as typeof fetch;

// Dynamic imports so missing packages don't break the bundle
Promise.all([
  import('@stardazed/streams-text-encoding').catch(() => null),
  import('@ungap/structured-clone').catch(() => null),
]).then(([streamsModule, structuredCloneModule]) => {
  if (streamsModule) {
    (global as any).TextEncoderStream = streamsModule.TextEncoderStream;
    (global as any).TextDecoderStream = streamsModule.TextDecoderStream;
  }

  if (structuredCloneModule && !('structuredClone' in globalThis)) {
    (global as any).structuredClone = structuredCloneModule.default;
  }
});
