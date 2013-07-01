var tokenGenerator = require('../token_generator.js');

describe("Things should be the same", function() {
  it("Should generate a token by key and data", function() {
    expect(tokenGenerator(data)).toBe('c4ecf38bc90d6086efdb2203d901ef7e');
  });
});