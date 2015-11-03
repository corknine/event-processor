var moment = require('moment');
var url = require('url');
var revenue = require('./revenue');

// TODO: test me a lot more
exports.call = function(event, firehosePut) {
  var timestamp = moment(event.timestamp).format("YYYY-MM-DD HH:MM:SS");
  var properties = event.properties;
  var referrer = event.properties.referrer;
  var page_url = event.properties.url;

  var row = [
    event.id,
    event.project_id,
    event.user_id,
    event.cookie_id,
    (event.user_id || event.cookie_id),
    event.event, 
    (event.context.ip || event.ip),
    referrer,
    url.parse(referrer).host,
    page_url,
    url.parse(page_url).path,
    revenue.parse(properties.revenue),
    timestamp
  ].join("\t") + "\n";

  firehosePut('events-stage-2-sandbox', row);

  var query = url.parse(properties.url, true).query;
  var rows = Object.keys(query).map(function(key) {
    return [
      event.id,
      key,
      query[key],
      timestamp,
      event.project_id
    ].join("\t");
  }).join("\n");

  firehosePut('params-stage-2-sandbox', rows);
  return;
}
