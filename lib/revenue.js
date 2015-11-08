
exports.parse = function(revenue) {
  if(typeof revenue === 'string' || revenue instanceof String) {
    var dollarString = revenue.trim().replace(/[$,]/g, '');
    var dollarFloat = parseFloat(dollarString);
  } else {
    var dollarFloat = revenue;
  }

  return dollarFloat.toFixed(2) * 100;
}

