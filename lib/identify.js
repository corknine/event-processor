var moment = require('moment');

exports.call = function(identify) {
  var timestamp = moment(identify.serverTime).format("YYYY-MM-DD HH:mm:ss");
  var visitor_id = identify.user_id || identify.cookie_id;
  var uuid = identify.uuid;

  var identifyData = {
    uuid: uuid,
    project_id: identify.project_id,
    user_id: identify.user_id,
    cookie_id: identify.cookie_id,
    visitor_id: visitor_id,
    timestamp: timestamp
  }

  var identifyRow = [
    'identify',
    uuid,
    JSON.stringify(identifyData),
    identify.key
  ].join("\t") + "\n";

  var traitRows = Object.keys(identify.traits).map(function(key) {
    var value = identify.traits[key];

    var traitData = {
      uuid: uuid,
      project_id: identify.project_id,
      user_id: identify.user_id,
      cookie_id: identify.cookie_id,
      visitor_id: visitor_id,
      key: key,
      value: value,
      timestamp: timestamp
    }

    return [
      'trait',
      uuid,
      JSON.stringify(traitData),
      identify.key
    ].join("\t");

  }).join("\n");

  return [ identifyRow, traitRows ].join("\n");
}
