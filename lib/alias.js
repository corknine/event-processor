var moment = require('moment');

exports.call = function(alias) {
  var timestamp = moment(alias.serverTime).format("YYYY-MM-DD HH:MM:SS");

  var visitor_id = identify.user_id || identify.cookie_id;
  var aliasRow = [
    identify.uuid,
    identify.project_id,
    identify.user_id,
    identify.cookie_id,
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
