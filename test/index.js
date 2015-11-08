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

    var timestamp = moment(body.timestamp || body.serverTime).format("YYYY-MM-DD HH:MM:SS");
    var properties = body.properties;
    var referring_url = body.properties.referrer;
    var page_url = body.properties.url;
    var uuid = "1";

    var bodyData = {
      uuid: uuid,
      project_id: body.project_id,
      user_id: body.user_id,
      cookie_id: body.cookie_id,
      visitor_id: (body.user_id || body.cookie_id),
      name: body.event,
      ip: (body.context.ip || body.serverIp),
      referring_url: referring_url,
      referring_host: url.parse(referring_url).host,
      page_url: page_url,
      page_path: url.parse(page_url).path,
      revenue: parseInt(body.properties.revenue) * 100,
      timestamp: timestamp
    };

    var eventRow = [
      'event',
      uuid,
      JSON.stringify(bodyData)
    ].join("\t");

    var query = url.parse(properties.url, true).query;
    var paramRows = Object.keys(query).map(function(key) {
      var paramData = {
        uuid: uuid,
        project_id: body.project_id,
        key: key,
        value: query[key],
        timestamp: timestamp
      };
      return [
        'param',
        uuid,
        JSON.stringify(paramData)
      ].join("\t");
    }).join("\n");

    var rows = [ eventRow, paramRows ].join("\n") + "\n";

    var testContext = {
      succeed: function() {
        sinon.assert.calledWith(firehoseSpy, {
          DeliveryStreamName: "tracking-2-development",
          Record: { Data: rows }
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
    var uuid = "1";

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
      uuid: uuid,
      type: "identify",
      body: JSON.stringify(body),
      timestamp: (new Date()).toISOString()
    }) + "\n"
    stubS3(line)

    var firehoseSpy = sinon.spy();
    stubFirehoseWithSpy(firehoseSpy);

    var timestamp = moment(body.serverTime).format("YYYY-MM-DD HH:MM:SS");
    var visitor_id = body.user_id || body.cookie_id;

    var bodyData = {
      uuid: uuid,
      project_id: body.project_id,
      user_id: body.user_id,
      cookie_id: body.cookie_id,
      visitor_id: visitor_id,
      timestamp: timestamp
    }

    var identifyRow = [
      'identify',
      uuid,
      JSON.stringify(bodyData)
    ].join("\t") + "\n";

    var traitRows = Object.keys(body.traits).map(function(key) {
      var value = body.traits[key];

      var traitData = {
        uuid: uuid,
        project_id: body.project_id,
        user_id: body.user_id,
        cookie_id: body.cookie_id,
        visitor_id: visitor_id,
        key: key,
        value: value,
        timestamp: timestamp
      }

      return [
        'trait',
        uuid,
        JSON.stringify(traitData)
      ].join("\t");

    }).join("\n");

    var rows = [ identifyRow, traitRows ].join("\n");

    var testContext = {
      succeed: function() {
        sinon.assert.calledWith(firehoseSpy, {
          DeliveryStreamName: "tracking-2-development",
          Record: { Data: rows }
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
    var uuid = "1";

    // Some data
    var body = {
      project_id: 2,
      user_id: null,
      cookie_id: "12345"
    };

    var line = JSON.stringify({
      uuid: uuid,
      type: "alias",
      body: JSON.stringify(body),
      timestamp: (new Date()).toISOString()
    }) + "\n"
    stubS3(line)

    var firehoseSpy = sinon.spy();
    stubFirehoseWithSpy(firehoseSpy);

    var timestamp = moment(body.serverTime).format("YYYY-MM-DD HH:MM:SS");
    var visitor_id = body.user_id || body.cookie_id;

    var bodyData = {
      uuid: uuid,
      project_id: body.project_id,
      user_id: body.user_id,
      cookie_id: body.cookie_id,
      visitor_id: visitor_id,
      timestamp: timestamp
    };

    var row = [
      'alias',
      uuid,
      JSON.stringify(bodyData)
    ].join("\t") + "\n";

    var testContext = {
      succeed: function() {
        sinon.assert.calledWith(firehoseSpy, {
          DeliveryStreamName: "tracking-2-development",
          Record: { Data: row }
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
