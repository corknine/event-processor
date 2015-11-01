var expect = require("chai").expect;

var revenue = require('../../lib/revenue');

// TODO come up with more tests for this
describe('Revenue', function(){
  it('parses an int', function(){
    expect(revenue.parse("1")).to.eql(100);
  });

  it('parses with a dollar sign and comma', function() {
    expect(revenue.parse("$1,000")).to.eql(100000);
  });

  it('parses with cents', function() {
    expect(revenue.parse("0.10")).to.eql(10);
  });
});
