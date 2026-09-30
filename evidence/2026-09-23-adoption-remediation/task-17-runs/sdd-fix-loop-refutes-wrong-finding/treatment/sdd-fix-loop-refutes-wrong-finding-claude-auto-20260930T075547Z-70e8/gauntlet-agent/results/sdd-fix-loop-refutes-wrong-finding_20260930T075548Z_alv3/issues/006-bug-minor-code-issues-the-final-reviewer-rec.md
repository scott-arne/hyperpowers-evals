# Bug: Minor code issues the final reviewer recorded and deliberately left unfixed: greet.js uses `name || 'friend'`, so greet(0) returns 'Hello, friend!' and greet('   ') returns 'Hello,    !'. Also, package.json has no test script, so `npm test` errors.

**Kind:** bug
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** pass

## Description

Minor code issues the final reviewer recorded and deliberately left unfixed: greet.js uses `name || 'friend'`, so greet(0) returns 'Hello, friend!' and greet('   ') returns 'Hello,    !'. Also, package.json has no test script, so `npm test` errors.
