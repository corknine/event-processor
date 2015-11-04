var moment = require('moment');

exports.call = function(alias) {
  var timestamp = moment(alias.serverTime).format("YYYY-MM-DD HH:MM:SS");
  var visitor_id = alias.user_id || alias.cookie_id;

  var aliasData = {
    uuid: alias.uuid,
    project_id: alias.project_id,
    user_id: alias.user_id,
    cookie_id: alias.cookie_id,
    visitor_id: visitor_id,
    timestamp: timestamp
  };

  return [
    'aliases',
    JSON.stringify(aliasData)
  ].join("\t") + "\n";
}
