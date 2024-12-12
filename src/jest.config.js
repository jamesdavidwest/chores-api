// jest.config.js

module.exports = {
    // The test environment that will be used for testing
    testEnvironment: 'node',
  
    // Directory containing test files
    testMatch: ['**/__tests__/**/*.test.js'],
  
    // Files to ignore
    testPathIgnorePatterns: ['/node_modules/'],
  
    // Coverage configuration
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coveragePathIgnorePatterns: [
      '/node_modules/',
      '/tests/',
      '/config/',
      '/logs/',
      'jest.config.js',
    ],
    coverageReporters: ['text', 'lcov', 'clover'],
  
    // Configure test timeouts
    testTimeout: 10000,
  
    // Set up test environment variables
    setupFiles: ['<rootDir>/tests/setup.js'],
  
    // Reporter configuration
    reporters: [
      'default',
      [
        'jest-junit',
        {
          outputDirectory: 'reports/junit',
          outputName: 'junit.xml',
          classNameTemplate: '{filepath}',
          titleTemplate: '{title}',
        },
      ],
    ],
    
    // Global test setup
    globalSetup: '<rootDir>/tests/globalSetup.js',
    globalTeardown: '<rootDir>/tests/globalTeardown.js',
  };