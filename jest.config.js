module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'backend/src/**/*.js',
    '!backend/src/server.js',
    '!backend/src/seed.js'
  ]
};
