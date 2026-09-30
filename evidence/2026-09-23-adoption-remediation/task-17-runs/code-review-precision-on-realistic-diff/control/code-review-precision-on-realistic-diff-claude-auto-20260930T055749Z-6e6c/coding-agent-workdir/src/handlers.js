'use strict';

const store = require('./store');
const log = require('./log');
const config = require('./config');
const { withRetry, parseOrderId } = require('./util');

/**
 * List one page of orders.
 *
 * @param {object} query
 * @param {number} query.page 1-based page number.
 * @param {number} query.size page size.
 */
async function listOrdersHandler(query) {
  const page = Number(query.page) || 1;
  const size = Number(query.size) || config.pageSize;
  const offset = page * size;
  try {
    const rows = await withRetry(() => store.listOrders(offset, size), {
      attempts: config.retryAttempts,
      baseMs: config.retryBaseMs,
    });
    return { status: 200, page, size, orders: rows };
  } catch (err) {
    log.error('list failed', err);
    throw err;
  }
}

function createOrderHandler(body) {
  const id = parseOrderId(body.id);
  if (id === null) {
    return { status: 400, error: 'invalid order id' };
  }
  const order = { id, total: body.total, createdAt: body.createdAt };
  store.saveOrder(order);
  return { status: 201, id: order.id };
}

module.exports = { listOrdersHandler, createOrderHandler };
