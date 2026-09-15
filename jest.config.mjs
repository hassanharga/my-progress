import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const config = {
  clearMocks: true,
  maxWorkers: 1,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.{ts,tsx}'],
  watchman: false,
};

export default createJestConfig(config);
