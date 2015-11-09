var moment = require('moment');

exports.call = function(alias) {
  var timestamp = moment(alias.serverTime).format("YYYY-MM-DD HH:mm:ss");
  var visitor_id = alias.user_id || alias.cookie_id;
  var uuid = alias.uuid;

  var aliasData = {
    uuid: uuid,
    project_id: alias.project_id,
    user_id: alias.user_id,
    cookie_id: alias.cookie_id,
    visitor_id: visitor_id,
    timestamp: timestamp
  };

  return [
    'alias',
    uuid,
    JSON.stringify(aliasData),
    alias.key
  ].join("\t") + "\n";
}
