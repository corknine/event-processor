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
    var s3ObjectData = {
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

    var line = [
      "1",
      "track",
      JSON.stringify(s3ObjectData),
      "10.0.0.1"
    ].join("\t") + "\n"

    stubS3(line)
    stubFirehoseWithSpy(firehoseSpy);

    var eventLine = [
      "1",
      s3ObjectData.project_id,
      s3ObjectData.user_id,
      s3ObjectData.cookie_id,
      (s3ObjectData.user_id || s3ObjectData.cookie_id),
      s3ObjectData.event, 
      s3ObjectData.context.ip,
      s3ObjectData.properties.referrer,
      url.parse(s3ObjectData.properties.referrer).host,
      s3ObjectData.properties.url,
      url.parse(s3ObjectData.properties.url).path,
      parseInt(s3ObjectData.properties.revenue) * 100,
      moment(s3ObjectData.timestamp).format("YYYY-MM-DD HH:MM:SS")
    ].join("\t") + "\n";

    var query = url.parse(s3ObjectData.properties.url, true).query;
    var paramLines = Object.keys(query).map(function(key) {
      return [
        "1",
        key,
        query[key],
        moment(s3ObjectData.timestamp).format("YYYY-MM-DD HH:MM:SS"),
        s3ObjectData.project_id
      ].join("\t");
    }).join("\n");

    var testContext = {
      succeed: function() {
        sinon.assert.calledWith(firehoseSpy, {
          DeliveryStreamName: "events-stage-2-sandbox",
          Record: { Data: eventLine }
        });

        sinon.assert.calledWith(firehoseSpy, {
          DeliveryStreamName: "params-stage-2-sandbox",
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
    // Some data
    var s3ObjectData = {
      project_id: 2,
      user_id: null,
      cookie_id: "12345"
    };

    var line = [
      "1",
      "identify",
      JSON.stringify(s3ObjectData)
    ].join("\t") + "\n"
    stubS3(line)

    var firehoseSpy = sinon.spy();
    stubFirehoseWithSpy(firehoseSpy);

    var eventLine = [
      "1",
      s3ObjectData.project_id,
      s3ObjectData.user_id,
      s3ObjectData.cookie_id,
      (s3ObjectData.user_id || s3ObjectData.cookie_id)
    ].join("\t") + "\n";

    var testContext = {
      succeed: function() {
        sinon.assert.calledWith(firehoseSpy, {
          DeliveryStreamName: "identifies-stage-2-sandbox",
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
