'use strict';

const orders = [];

async function listOrders(offset, limit) {
  return orders.slice(offset, offset + limit);
}

async function saveOrder(order) {
  if (!order || !order.id) {
    throw new Error('order requires an id');
  }
  if (!(order.total > 0)) {
    throw new Error('order total must be positive');
  }
  orders.push(order);
  return order;
}

module.exports = { orders, listOrders, saveOrder };
