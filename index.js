var AWS = require('aws-sdk');
var s3 = new AWS.S3({ apiVersion: '2006-03-01' });
var firehose = new AWS.Firehose({apiVersion: '2015-08-04'});

var through2 = require('through2');
var pipe = require('multipipe');
var WaitGroup = require('waitgroup');
var split = require('split');
var parsers = {
  track: require('./lib/track'),
  identify: require('./lib/identify'),
  alias: require('./lib/alias')
};

exports.handler = function(s3Event, context) {
  var bucket = s3Event.Records[0].s3.bucket.name;
  var key = s3Event.Records[0].s3.object.key;
  var wg = new WaitGroup;

  console.log('Received S3 event, downloading file: ' + key);

  /**
   * Event Extraction Pipeline
   *
   * - incr wg
   * - open stream
   * - decode Buffer chunks to String
   * - buffer strings to newlines
   * - emit parsed events
   * - on each event -> incr wg, to firehose -> decr wg
   * - decr wg on stream close
   */

  wg.add();
  s3.getObject({ Bucket: bucket, Key: key })
    .createReadStream()
    .pipe(stringify())
    .pipe(split(parse))
    .on('data', handleEvent)
    .on('error', handleError)
    .on('end', function(){
      wg.done();
    });

  wg.wait(function() {
    console.log('Finished file!');
    context.succeed();
   });


   /**
   * The event handler
   *
   * Takes an event and writes it to the firehoses
   *
   * @param {Object} event
   */
  function handleEvent(event) {
    try {
      var rows = parsers[event.type].call(event);
    }
    catch (err) {
      console.log(event);
      console.log(err, err.stack.split("\n"));
    }
    firehosePut(rows);
  }

  function firehosePut(data) {
    wg.add();
    firehose.putRecord({
      DeliveryStreamName: 'tracking-2-development',
      Record: { Data: data }
    }, function(err, data) {
      if (err) handleError(err);
      wg.done();
    });
  }

  // decode Buffer chunks to strings
  function stringify() {
    return through2(function(data, _, cb) {
      cb(null, data.toString('utf8'));
    });
  }

  // take lines emitted from `split` and parse them
  function parse(str) {
    if(str === '') return null;
    var parsed = JSON.parse(str.trim());
    var data = JSON.parse(parsed.body);
    data.uuid = parsed.uuid;
    data.type = parsed.type;
    data.serverTime = parsed.timestamp;
    data.serverIp = parsed.ip;
    return data;
  }

  function handleError(err) {
    console.log('ErrorBatch:', key);
    console.log('Error:', err);
    console.log('Exiting...');
    context.fail(err);
  }
};
