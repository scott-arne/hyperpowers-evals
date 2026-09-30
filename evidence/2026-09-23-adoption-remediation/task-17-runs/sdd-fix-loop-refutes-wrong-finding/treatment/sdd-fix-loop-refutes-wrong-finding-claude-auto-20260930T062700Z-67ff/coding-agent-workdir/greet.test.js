const { test } = require('node:test')
const assert = require('node:assert')
const { greet } = require('./greet')

test('greet returns formatted greeting with name', () => {
  assert.strictEqual(greet('Alice'), 'Hello, Alice!')
})

test('greet handles empty string gracefully', () => {
  assert.strictEqual(greet(''), 'Hello, there!')
})

test('greet handles no argument gracefully', () => {
  assert.strictEqual(greet(), 'Hello, there!')
})

test('greet handles whitespace-only input gracefully', () => {
  assert.strictEqual(greet('   '), 'Hello, there!')
})

test('greet trims surrounding whitespace from name', () => {
  assert.strictEqual(greet('  Bob  '), 'Hello, Bob!')
})
