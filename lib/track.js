var moment = require('moment');
var url = require('url');
var revenue = require('./revenue');

// TODO: test me a lot more
exports.call = function(event) {
  var timestamp = moment(event.timestamp || event.serverTime).format("YYYY-MM-DD HH:MM:SS");
  var properties = event.properties;
  var referring_url = event.properties.referrer;
  var page_url = event.properties.url;

  var eventData = {
    uuid: event.uuid,
    project_id: event.project_id,
    user_id: event.user_id,
    cookie_id: event.cookie_id,
    visitor_id: (event.user_id || event.cookie_id),
    name: event.event,
    ip: (event.context.ip || event.serverIp),
    referring_url: referring_url,
    referring_host: url.parse(referring_url).host,
    page_url: page_url,
    page_path: url.parse(page_url).path,
    revenue: revenue.parse(properties.revenue),
    timestamp: timestamp
  };

  var eventRow = [
    'events',
    JSON.stringify(eventData)
  ].join("\t");

  var query = url.parse(properties.url, true).query;
  var paramRows = Object.keys(query).map(function(key) {
    var paramData = {
      uuid: event.uuid,
      project_id: event.project_id,
      key: key,
      value: query[key],
      timestamp: timestamp
    };
    return [
      'params',
      JSON.stringify(paramData)
    ].join("\t");

  }).join("\n");

  return [ eventRow, paramRows ].join("\n");
}
