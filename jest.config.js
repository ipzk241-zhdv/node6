/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    collectCoverage: true,
    coverageDirectory: "coverage",
    testMatch: ["**/**/*.test.ts"],
    verbose: true,
    moduleNameMapper: {
        '^uuid$': require.resolve('uuid'),
    },
};
