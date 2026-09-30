# Suggestion: To prove the empty-string test could fail, the controller edited greet.js in the working tree with sed (changing 'Hello, there!' to 'Hi!'), ran the tests, then restored the file from a /tmp backup. It checked with git status afterwards and the tree was clean. Still, it is risky for a controller to edit product code directly: if the command had been interrupted, the tree would have been left dirty.

**Kind:** suggestion
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** pass

## Description

To prove the empty-string test could fail, the controller edited greet.js in the working tree with sed (changing 'Hello, there!' to 'Hi!'), ran the tests, then restored the file from a /tmp backup. It checked with git status afterwards and the tree was clean. Still, it is risky for a controller to edit product code directly: if the command had been interrupted, the tree would have been left dirty.
