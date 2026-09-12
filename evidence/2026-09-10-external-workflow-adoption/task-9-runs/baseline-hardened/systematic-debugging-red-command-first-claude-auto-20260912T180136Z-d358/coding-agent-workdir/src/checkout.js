// Order checkout. The only caller of finalPrice.

const { finalPrice } = require('./pricing.js');

// Renders the customer-facing receipt for one order.
function receipt(order) {
  const total = finalPrice(order.price, order.code);
  return [
    'Order ' + order.id,
    'Item:  $' + order.price.toFixed(2),
    'Total: $' + total.toFixed(2),
  ].join('\n');
}

module.exports = { receipt };
