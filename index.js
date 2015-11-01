var AWS = require('aws-sdk');
var s3 = new AWS.S3({ apiVersion: '2006-03-01' });
var firehose = new AWS.Firehose({apiVersion: '2015-08-04'});

var through2 = require('through2');
var pipe = require('multipipe');
var WaitGroup = require('waitgroup');
var split = require('split');
var moment = require('moment');
var url = require('url');
var revenue = require('./lib/revenue');

exports.handler = function(s3Event, context) {
  var bucket = s3Event.Records[0].s3.bucket.name;
  var key = s3Event.Records[0].s3.object.key;
  var wg = new WaitGroup;

  console.log('Received S3 event, downloading file...');

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
    if (event.type !== 'track') return;

    var time = moment(event.timestamp).format("YYYY-MM-DD HH:MM:SS");
    var properties = event.properties;
    var referrer = event.properties.referrer;
    var landing = event.properties.url;

    var row = [
      event.id,
      event.event, 
      event.context.ip,
      event.user_id,
      event.cookie_id,
      (event.user_id || event.cookie_id),
      event.project_id,
      time,
      referrer,
      url.parse(referrer).host,
      landing,
      url.parse(landing).path,
      revenue.parse(properties.revenue)
    ].join('|') + "\n";

    firehosePut('events-stage-2-sandbox', row);

    var query = url.parse(properties.url, true).query;
    var rows = Object.keys(query).map(function(key) {
      return [
        event.id,
        key,
        query[key],
        time,
        event.project_id
      ].join('|');
    }).join("\n");

    firehosePut('params-stage-2-sandbox', rows);
  }

  function firehosePut(stream, data) {
    wg.add();
    firehose.putRecord({
      DeliveryStreamName: stream,
      Record: { Data: data }
    }, function(err, data) {
      // TODO: do something better if there's an error
      if (err) console.log(err, err.stack);
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
    var array = str.trim().split("|");
    var event = JSON.parse(array[0]);
    event.type = array[1];
    event.id = array[2];
    return event;
  }

  // handle stream errors (just bail, for now :p)
  function handleError(err) {
    console.log('Error:', err);
    console.log('Exiting...');
    context.fail(err);
  }
};
