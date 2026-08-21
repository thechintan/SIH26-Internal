/**
 * Node-side MSW server, for Vitest and for server components rendered during
 * tests. Owner: E (integration).
 *
 *     import { server } from '@/mocks/server';
 *     beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
 *     afterEach(() => server.resetHandlers());
 *     afterAll(() => server.close());
 *
 * `onUnhandledRequest: 'error'` in tests on purpose: a test that quietly reaches
 * the real network is a test that passes on your machine and fails in CI.
 */
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
