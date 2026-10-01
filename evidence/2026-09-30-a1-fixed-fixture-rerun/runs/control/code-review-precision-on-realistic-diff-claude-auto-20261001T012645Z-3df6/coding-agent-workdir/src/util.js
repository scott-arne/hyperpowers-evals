'use strict';

function nowIso(clock) {
  return new Date(clock()).toISOString();
}

async function withRetry(fn, { attempts, baseMs }) {
  let lastErr;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i === attempts - 1) break;
      await new Promise((resolve) => setTimeout(resolve, baseMs * 2 ** i));
    }
  }
  throw lastErr;
}

const ORDER_ID = /^ord_[a-z0-9]{8}$/;

function parseOrderId(s) {
  return typeof s === 'string' && ORDER_ID.test(s) ? s : null;
}

module.exports = { nowIso, withRetry, parseOrderId };
