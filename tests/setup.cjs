// Use the real serial TVM engine so the offline suite has no orphan workers.
const { TvmRunnerAsynchronous, TvmRunnerSynchronous } = require("ton-contract-executor");
beforeAll(() => {
  jest.spyOn(TvmRunnerAsynchronous, "getShared").mockReturnValue(new TvmRunnerSynchronous());
});
afterAll(() => jest.restoreAllMocks());
