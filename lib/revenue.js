
exports.parse = function(string) {
  var dollarString = string.trim().replace(/[$,]/g, '');
  var dollarFloat = parseFloat(dollarString);
  var cents = dollarFloat.toFixed(2) * 100;
  return cents;
}

