// Things we need for testing
var expect = require("chai").expect;
var rewire = require("rewire");
var moment = require("moment");
var MemoryStream = require('memorystream');
var url = require('url');
var sinon = require('sinon');

// module under test
var lambda = rewire('../index');

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

var testEvent = {
  Records: [{
    s3: {
      bucket: { name: 'fake-bucket-name' },
      object: { key: 'fake-bucket-key' }
    }
  }]
};

// The fake stream
var memStream = new MemoryStream();
memStream.write(
  [
    JSON.stringify(s3ObjectData),
    "track",
    "1"
  ].join("|") + "\n"
);
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

describe('lambda', function(){
  it('calls firehose with the data', function(done){
    var firehoseSpy = sinon.spy();

    lambda.__set__("firehose", {
      putRecord: function(opt, cb) {
        firehoseSpy(opt);
        cb();
      }
    });

    var eventLine = [
      "1",
      s3ObjectData.event, 
      s3ObjectData.context.ip,
      s3ObjectData.user_id,
      s3ObjectData.cookie_id,
      (s3ObjectData.user_id || s3ObjectData.cookie_id),
      s3ObjectData.project_id,
      moment(s3ObjectData.timestamp).format("YYYY-MM-DD HH:MM:SS"),
      s3ObjectData.properties.referrer,
      url.parse(s3ObjectData.properties.referrer).host,
      s3ObjectData.properties.url,
      url.parse(s3ObjectData.properties.url).path,
      parseInt(s3ObjectData.properties.revenue) * 100
    ].join('|') + "\n";

    var query = url.parse(s3ObjectData.properties.url, true).query;
    var paramLines = Object.keys(query).map(function(key) {
      return [
        "1",
        key,
        query[key],
        moment(s3ObjectData.timestamp).format("YYYY-MM-DD HH:MM:SS"),
        s3ObjectData.project_id
      ].join('|');
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

    lambda.handler(testEvent, testContext);

  })
})
