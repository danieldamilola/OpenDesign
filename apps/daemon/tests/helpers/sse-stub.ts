import type { SseResponseWriter } from '../../src/server-context.js';

/**
 * Minimal no-op SSE writer for route tests that build a typed `HttpDeps`
 * stub but never stream events.
 */
export function stubSseWriter(): SseResponseWriter {
  return {
    send: () => true,
    writeKeepAlive: () => true,
    cleanup: () => undefined,
    end: () => undefined,
  };
}
