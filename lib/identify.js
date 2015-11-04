var moment = require('moment');

exports.call = function(identify) {
  var timestamp = moment(identify.serverTime).format("YYYY-MM-DD HH:MM:SS");
  var visitor_id = identify.user_id || identify.cookie_id;

  var identifyData = {
    uuid: identify.uuid,
    project_id: identify.project_id,
    user_id: identify.user_id,
    cookie_id: identify.cookie_id,
    visitor_id: visitor_id,
    timestamp: timestamp
  }

  var identifyRow = [
    'identifies',
    JSON.stringify(identifyData)
  ].join("\t") + "\n";

  var traitRows = Object.keys(identify.traits).map(function(key) {
    var value = identify.traits[key];

    var traitData = {
      uuid: identify.uuid,
      project_id: identify.project_id,
      user_id: identify.user_id,
      cookie_id: identify.cookie_id,
      visitor_id: visitor_id,
      key: key,
      value: value,
      timestamp: timestamp
    }

    return [
      'traits',
      JSON.stringify(traitData)
    ].join("\t");

  }).join("\n");

  return [ identifyRow, traitRows ].join("\n");
}
