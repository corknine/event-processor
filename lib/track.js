var moment = require('moment');
var url = require('url');
var revenue = require('./revenue');

// TODO: test me a lot more
exports.call = function(event) {
  var timestamp = moment(event.timestamp || event.serverTime).format("YYYY-MM-DD HH:MM:SS");
  var properties = event.properties;
  var referrer = event.properties.referrer;
  var page_url = event.properties.url;

  var eventRow = [
    event.uuid,
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

  var query = url.parse(properties.url, true).query;
  var paramRows = Object.keys(query).map(function(key) {
    return [
      event.uuid,
      event.project_id,
      key,
      query[key],
      timestamp
    ].join("\t");
  }).join("\n");

  return [
    {
      stream: 'events-sandbox',
      data: eventRow
    },
    {
      stream: 'params-sandbox',
      data: paramRows
    }
  ]
}
