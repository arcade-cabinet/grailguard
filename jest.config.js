/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react-native$': '<rootDir>/src/__mocks__/react-native.ts',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
  },
  collectCoverageFrom: [
    'src/engine/**/*.ts',
    'src/db/**/*.ts',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 35,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
};

module.exports = config;
