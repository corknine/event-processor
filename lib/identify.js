var moment = require('moment');

exports.call = function(event, firehosePut) {
  var row = [
    event.id,
    event.project_id,
    event.user_id,
    event.cookie_id,
    (event.user_id || event.cookie_id)
  ].join("\t") + "\n";

  firehosePut('identifies-stage-2-sandbox', row);
  return;
}
