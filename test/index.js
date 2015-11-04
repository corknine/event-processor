// Things we need for testing
var expect = require("chai").expect;
var rewire = require("rewire");
var moment = require("moment");
var MemoryStream = require('memorystream');
var url = require('url');
var sinon = require('sinon');

var lambda = rewire('../index');

describe('track event', function(){
  it('calls firehose with the data', function(done){
    var firehoseSpy = sinon.spy();

    // Some data
    var body = {
      project_id: 2,
      event: "Viewed a Page",
      context: {
        userAgent: 'Mac OS X',
        ip: '10.0.0.2'
      },
      properties: {
        url: 'http://example.com/the/path?key1=value1&key2=value2',
        referrer: 'http://www.referrer.com/',
        revenue: "10"
      },
      user_id: null,
      cookie_id: "12345",
      timestamp: (new Date()).toISOString()
    };

    var line = JSON.stringify({
      uuid: "1",
      type: "track",
      body: JSON.stringify(body),
      timestamp: (new Date()).toISOString(),
      ip: "10.0.0.1"
    }) + "\n"

    stubS3(line)
    stubFirehoseWithSpy(firehoseSpy);

    var eventLine = [
      "1",
      body.project_id,
      body.user_id,
      body.cookie_id,
      (body.user_id || body.cookie_id),
      body.event, 
      body.context.ip,
      body.properties.referrer,
      url.parse(body.properties.referrer).host,
      body.properties.url,
      url.parse(body.properties.url).path,
      parseInt(body.properties.revenue) * 100,
      moment(body.timestamp).format("YYYY-MM-DD HH:MM:SS")
    ].join("\t") + "\n";

    var query = url.parse(body.properties.url, true).query;
    var paramLines = Object.keys(query).map(function(key) {
      return [
        "1",
        body.project_id,
        key,
        query[key],
        moment(body.timestamp).format("YYYY-MM-DD HH:MM:SS")
      ].join("\t");
    }).join("\n");

    var testContext = {
      succeed: function() {
        sinon.assert.calledWith(firehoseSpy, {
          DeliveryStreamName: "events-sandbox",
          Record: { Data: eventLine }
        });

        sinon.assert.calledWith(firehoseSpy, {
          DeliveryStreamName: "params-sandbox",
          Record: { Data: paramLines }
        });
        done();
      },
      fail: done
    };

    lambda.handler(testEvent(), testContext);
  })
})

describe('identify event', function(){
  it('calls firehose with the data', function(done){
    var serverTime = (new Date()).toISOString();

    // Some data
    var body = {
      project_id: 2,
      user_id: null,
      cookie_id: "12345",
      traits: {
        name: "Sam",
        email: "sam@reh.com"
      }
    };

    var line = JSON.stringify({
      uuid: "1",
      type: "identify",
      body: JSON.stringify(body),
      timestamp: (new Date()).toISOString()
    }) + "\n"
    stubS3(line)

    var firehoseSpy = sinon.spy();
    stubFirehoseWithSpy(firehoseSpy);

    var identifyLine = [
      "1",
      body.project_id,
      body.user_id,
      body.cookie_id,
      (body.user_id || body.cookie_id),
      moment(serverTime).format("YYYY-MM-DD HH:MM:SS")
    ].join("\t") + "\n";

    var traitLines = Object.keys(body.traits).map(function(key) {
      var value = body.traits[key];

      return [
        "1",
        body.project_id,
        body.user_id,
        body.cookie_id,
        (body.user_id || body.cookie_id),
        key,
        value,
        moment(body.timestamp).format("YYYY-MM-DD HH:MM:SS")
      ].join("\t");
    }).join("\n");

    var testContext = {
      succeed: function() {
        sinon.assert.calledWith(firehoseSpy, {
          DeliveryStreamName: "identifies-sandbox",
          Record: { Data: identifyLine }
        });
        sinon.assert.calledWith(firehoseSpy, {
          DeliveryStreamName: "traits-sandbox",
          Record: { Data: traitLines }
        });
        done();
      },
      fail: done
    };

    lambda.handler(testEvent(), testContext);
  })
})

describe('alias event', function(){
  it('calls firehose with the data', function(done){
    var serverTime = (new Date()).toISOString();

    // Some data
    var body = {
      project_id: 2,
      user_id: null,
      cookie_id: "12345"
    };

    var line = JSON.stringify({
      uuid: "1",
      type: "alias",
      body: JSON.stringify(body),
      timestamp: (new Date()).toISOString()
    }) + "\n"
    stubS3(line)

    var firehoseSpy = sinon.spy();
    stubFirehoseWithSpy(firehoseSpy);

    var eventLine = [
      "1",
      body.project_id,
      body.user_id,
      body.cookie_id,
      (body.user_id || body.cookie_id),
      moment(serverTime).format("YYYY-MM-DD HH:MM:SS")
    ].join("\t") + "\n";

    var testContext = {
      succeed: function() {
        sinon.assert.calledWith(firehoseSpy, {
          DeliveryStreamName: "alias-sandbox",
          Record: { Data: eventLine }
        });
        done();
      },
      fail: done
    };

    lambda.handler(testEvent(), testContext);
  })
})


function stubS3(data) {
  // The fake stream
  var memStream = new MemoryStream();
  memStream.write(data);
  memStream.end();

  // Mocks AWS
  lambda.__set__("s3", {
    getObject: function(opts) { 
      return {
        createReadStream: function() {
          return memStream;
        }
      };
    }
  });
}

function stubFirehoseWithSpy(spy) {
  lambda.__set__("firehose", {
    putRecord: function(opt, cb) {
      spy(opt);
      cb();
    }
  });
}

function testEvent() {
  return {
    Records: [{
      s3: {
        bucket: { name: 'fake-bucket-name' },
        object: { key: 'fake-bucket-key' }
      }
    }]
  };
}
