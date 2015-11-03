var moment = require('moment');

exports.call = function(identify) {
  var timestamp = moment(identify.serverTime).format("YYYY-MM-DD HH:MM:SS");

  var visitor_id = identify.user_id || identify.cookie_id;
  var identifyRow = [
    identify.uuid,
    identify.project_id,
    identify.user_id,
    identify.cookie_id,
    visitor_id,
    timestamp
  ].join("\t") + "\n";

  var traitRows = Object.keys(identify.traits).map(function(key) {
    var value = identify.traits[key];

    return [
      identify.uuid,
      identify.project_id,
      visitor_id,
      key,
      value,
      timestamp
    ].join("\t");
  }).join("\n");

  return [
    {
      stream: 'identifies-sandbox',
      data: identifyRow
    },
    {
      stream: 'traits-sandbox',
      data: traitRows
    }
  ];
}
