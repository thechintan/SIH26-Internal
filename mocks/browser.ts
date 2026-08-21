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

export async function startMocks() {
  if (typeof window === 'undefined') return;
  await worker.start({
    // Anything not in handlers hits the network as normal — map tiles, fonts,
    // and Supabase must not be swallowed by the mock layer.
    onUnhandledRequest: 'bypass',
    quiet: false,
  });
  console.info('[msw] mocking enabled — NEXT_PUBLIC_USE_MOCKS=true');
}
