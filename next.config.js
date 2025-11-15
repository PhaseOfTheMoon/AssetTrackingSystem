const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    // Fixed regex - the forward slashes need to be escaped properly
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '<rootDir>/JUnitTesting/**/*.test.ts?(x)',
    '<rootDir>/JUnitTesting/**/*.spec.ts?(x)',
  ],
  collectCoverageFrom: [
    'components/**/*.{js,jsx,ts,tsx}',
    'app/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
  ],
}

module.exports = createJestConfig(customJestConfig)