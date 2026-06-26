/** Solo módulos TS puros (sin Next/edge). */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/lib/__tests__/**/*.test.ts'],
};