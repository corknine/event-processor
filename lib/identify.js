var moment = require('moment');

exports.call = function(identify) {
  var visitor_id = identify.user_id || identify.cookie_id;
  var identifyRow = [
    identify.uuid,
    identify.project_id,
    identify.user_id,
    identify.cookie_id,
    visitor_id
  ].join("\t") + "\n";

  var traitRows = Object.keys(identify.traits).map(function(key) {
    var value = identify.traits[key];

    return [
      identify.uuid
      identify.project_id,
      visitor_id,
      key,
      value
    ].join("\t");
  }).join("\n");

  return [
    {
      stream: 'identifies-stage-2-sandbox',
      data: identifyRow
    },
    {
      stream: 'traits-stage-2-sandbox',
      data: traitRows
    }
  ];
}
