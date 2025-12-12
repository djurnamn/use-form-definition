import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';

// Mock for any async operations during testing
(globalThis as any).fetch = vi.fn();

// Setup any global test configuration here
beforeEach(() => {
  vi.clearAllMocks();
});