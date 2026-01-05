import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll } from 'vitest';
import { server } from './mocks/server';

// Establish API mocking before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests
afterEach(() => {
  cleanup();
  server.resetHandlers();
});

// Clean up after the tests are finished
afterAll(() => server.close());
