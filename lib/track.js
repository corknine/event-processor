var moment = require('moment');
var url = require('url');
var revenue = require('./revenue');

function call(event) {
  var eventData = parseEvent(event);
  var eventRow = [
    'event',
    event.uuid,
    JSON.stringify(eventData),
    event.key
  ].join("\t");

  var paramRows = parseParams(event).map(function(param) {
    return [
      'param',
      event.uuid,
      JSON.stringify(param),
      event.key
    ].join("\t");
  });

  return [ eventRow ].concat(paramRows).join("\n") + "\n";
};

function parseEvent(event) {
  var properties = downcaseProperties(event);
  var referringUrl = specialDecodeURI(properties.referrer || "");
  var pageUrl = specialDecodeURI(properties.url || "");
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

function specialDecodeURI(url) {
  var urlString = url || "";
  var decoded;

  try {
    decoded = decodeURI(urlString);
  } catch(err) {
    decoded = unescape(urlString);
  }
  return decoded;
}

function parseTimestamp(event) {
  return moment(event.timestamp || event.serverTime).format("YYYY-MM-DD HH:mm:ss");
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
  var decodedUri = specialDecodeURI(properties.url || "");
  var query = url.parse(decodedUri, true).query;

  var pairs = [];
  Object.keys(query).forEach(function(key) {
    var value = query[key];

    if(typeof value === 'array' || value instanceof Array) {
      var values = value.forEach(function(value) {
        pairs.push([key, value]);
      });
    } else {
      pairs.push([key, value]);
    };
  });

  return pairs.map(function(array) {
    var key = array[0];
    var value = array[1];
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
