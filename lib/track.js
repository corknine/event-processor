var moment = require('moment');
var url = require('url');
var revenue = require('./revenue');

function call(event) {
  var eventData = parseEvent(event);
  var eventRow = [
    'event',
    event.uuid,
    JSON.stringify(eventData)
  ].join("\t");

  var paramRows = parseParams(event).map(function(param) {
    return [
      'param',
      event.uuid,
      JSON.stringify(param)
    ].join("\t");
  });

  return [ eventRow ].concat(paramRows).join("\n") + "\n";
};

function parseEvent(event) {
  var properties = downcaseProperties(event);
  var referringUrl = decodeURI(properties.referrer || "");
  var pageUrl = decodeURI(properties.url || "");
  var uuid = event.uuid;

  var ip;
  if(event.context && event.context.ip)
    ip = event.context.ip;
  else
    ip = event.serverIp;

  return {
    uuid: uuid,
    project_id: event.project_id,
    user_id: event.user_id,
    cookie_id: event.cookie_id,
    visitor_id: (event.user_id || event.cookie_id),
    name: event.event,
    ip: ip,
    referring_url: referringUrl,
    referring_host: url.parse(referringUrl || "").host,
    page_url: pageUrl,
    page_path: url.parse(pageUrl || "").path,
    revenue: revenue.parse(properties.revenue || ""),
    timestamp: parseTimestamp(event)
  };
}

function parseTimestamp(event) {
  return moment(event.timestamp || event.serverTime).format("YYYY-MM-DD HH:MM:SS");
}

function downcaseProperties(event) {
  var props = event.properties || {};
  Object.keys(props).forEach(function(key) {
    var value = props[key];
    delete props[key];
    props[key.toLowerCase()] = value;
  });
  return props;
}

function parseParams(event) {
  var properties = downcaseProperties(event);
  var query = url.parse(properties.url || "", true).query;

  return Object.keys(query).map(function(key) {
    var value = query[key];
    if(!value) return;

    var key = key.toLowerCase();
    if(key !== 'gclid')
      value = value.toLowerCase();

    return {
      uuid: event.uuid,
      project_id: event.project_id,
      key: key,
      value: value,
      timestamp: parseTimestamp(event)
    };
  });
}

module.exports = {
  call: call,
  parseEvent: parseEvent,
  parseParams: parseParams
}
