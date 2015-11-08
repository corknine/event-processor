var expect = require("chai").expect;

var url = require('url');
var track = require('../../lib/track');
var moment = require('moment');

describe('parseEvent', function(){
  function parsed(event) {
    return track.parseEvent(event) 
  }

  it('uses the events timestamp', function(){
    var time = moment();
    var event = { timestamp: time.toISOString() };
    expect(parsed(event).timestamp).to.eql(time.format("YYYY-MM-DD HH:MM:SS"));
  });

  it('uses the server timestamp if no event timestamp', function(){
    var time = moment();
    var event = { serverTime: time.toISOString() };
    expect(parsed(event).timestamp).to.eql(time.format("YYYY-MM-DD HH:MM:SS"));
  });

  it('uses the context ip', function(){
    var event = { context: { ip: "10.0.0.1" } };
    expect(parsed(event).ip).to.eql(event.context.ip);
  });

  it('uses the server ip if no context', function(){
    var event = { serverIp: "10.0.0.1" };
    expect(parsed(event).ip).to.eql(event.serverIp);
  });

  it('works with an escaped referrer', function(){
    var url = "http://nark.AintShit?Mayu%20rasa%C3%96na=Mayurasa%C3%96na"; 
    var event = { properties: { referrer: url } };
    expect(parsed(event).referring_url).to.eql("http://nark.AintShit?Mayu rasaÖna=MayurasaÖna");
  });

  it('works with an escaped url', function(){
    var url = "http://nark.AintShit?Mayu%20rasa%C3%96na=Mayurasa%C3%96na"; 
    var event = { properties: { URL: url } };
    expect(parsed(event).page_url).to.eql("http://nark.AintShit?Mayu rasaÖna=MayurasaÖna");
  });
});

describe('parseParams', function(){
  function parsed(event) {
    return track.parseParams(event) 
  }

  it('parses the params', function(){
    var time = moment();
    var event = {
      timestamp: time.toISOString(),
      properties: {
        url: "http://sam.AintShit?utm%20source=facebook%20please&Mayurasa%C3%96na=Mayurasa%C3%96na"
      }
    };
    var firstParam = parsed(event)[0];
    expect(firstParam.timestamp).to.eql(time.format("YYYY-MM-DD HH:MM:SS"));
    expect(firstParam.key).to.eql("utm source");
    expect(firstParam.value).to.eql("facebook please");

    var secondParam = parsed(event)[1];
    expect(secondParam.key).to.eql("mayurasaöna");
    expect(secondParam.value).to.eql("mayurasaöna");
  });

  it('handles arrays', function() {
    var url = "http://sam.AintShit?utm%20source=facebook%20please&Mayurasa%C3%96na=Mayurasa%C3%96na&utm%20source=bing";
    var time = moment();
    var event = {
      timestamp: time.toISOString(),
      properties: { url: url }
    };

    var firstParam = parsed(event)[0];
    expect(firstParam.timestamp).to.eql(time.format("YYYY-MM-DD HH:MM:SS"));
    expect(firstParam.key).to.eql("utm source");
    expect(firstParam.value).to.eql("facebook please");
  });

  it('does not parse a null value param', function(){
    var event = {
      properties: {
        url: "http://sam.AintShit?utm_campaign"
      }
    };
    expect(parsed(event)[0]).to.eql(undefined);
  });

  it('parses a fragment after the query', function() {
    var event = {
      properties: {
        url: "http://sam.AintShit/?utm_source=facebook#fragment (stuff)"
      }
    };
    var firstParam = parsed(event)[0];
    expect(firstParam.key).to.eql("utm_source");
    expect(firstParam.value).to.eql("facebook");
  });
});
