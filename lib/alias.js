var moment = require('moment');

exports.call = function(alias) {
  var timestamp = moment(alias.serverTime).format("YYYY-MM-DD HH:MM:SS");

  var visitor_id = alias.user_id || alias.cookie_id;
  var aliasRow = [
    alias.uuid,
    alias.project_id,
    alias.user_id,
    alias.cookie_id,
    visitor_id,
    timestamp
  ].join("\t") + "\n";

  return [
    {
      stream: 'alias-sandbox',
      data: aliasRow
    }
  ];
}
