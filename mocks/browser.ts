/**
 * Browser-side MSW worker. Owner: E (integration).
 *
 * Wire this up once, in a client component mounted high in the tree:
 *
 *     if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
 *       const { startMocks } = await import('@/mocks/browser');
 *       await startMocks();
 *     }
 *
 * Requires the service worker file, generated once per clone:
 *     npx msw init public/ --save
 */
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

/**
 * Idempotent. React StrictMode double-mounts effects in dev, and a hot reload
 * will call this again inside the same page context — a second `worker.start()`
 * throws `"cannot configure an already enabled network"`. Once the module has
 * successfully started, further calls resolve to the same promise.
 */
let startPromise: Promise<void> | null = null;

export function startMocks(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (startPromise) return startPromise;

  startPromise = worker
    .start({
      // Anything not in handlers hits the network as normal — map tiles, fonts,
      // and Supabase must not be swallowed by the mock layer.
      onUnhandledRequest: 'bypass',
      quiet: false,
    })
    .then(() => {
      console.info('[msw] mocking enabled — NEXT_PUBLIC_USE_MOCKS=true');
    })
    .catch((err) => {
      // A start error means the caller should never see a resolved promise;
      // reset so the next mount can retry with a clean slate.
      startPromise = null;
      throw err;
    });

  return startPromise;
}
