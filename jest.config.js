module.exports = {
  projects: [
    '<rootDir>/services/auth-service',
    '<rootDir>/services/user-service'
  ],
  collectCoverageFrom: [
    'services/**/src/**/*.ts',
    '!services/**/src/**/*.d.ts',
    '!services/**/src/**/__tests__/**',
    '!services/**/src/**/*.test.ts',
    '!services/**/src/**/*.spec.ts',
    '!services/**/src/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  maxWorkers: 1 // Run all projects sequentially to avoid database conflicts
};
