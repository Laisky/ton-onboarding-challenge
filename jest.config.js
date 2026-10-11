module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testTimeout: 30000,
    setupFilesAfterEnv: ['<rootDir>/tests/setup.cjs'],
};
