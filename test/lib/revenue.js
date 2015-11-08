var expect = require("chai").expect;

var revenue = require('../../lib/revenue');

describe('Revenue', function(){
  it('handles non string', function(){
    expect(revenue.parse(33.99)).to.eql(3399);
  });

  it('parses an int', function(){
    expect(revenue.parse("1")).to.eql(100);
  });

  it('parses with a dollar sign and comma', function() {
    expect(revenue.parse("$1,000.00")).to.eql(100000);
  });

  it('parses with cents', function() {
    expect(revenue.parse("0.10")).to.eql(10);
  });

  it('parses with one decimal', function() {
    expect(revenue.parse(".1")).to.eql(10);
  });

  it('parses with many decimals', function() {
    expect(revenue.parse(".115")).to.eql(12);
  });
});
