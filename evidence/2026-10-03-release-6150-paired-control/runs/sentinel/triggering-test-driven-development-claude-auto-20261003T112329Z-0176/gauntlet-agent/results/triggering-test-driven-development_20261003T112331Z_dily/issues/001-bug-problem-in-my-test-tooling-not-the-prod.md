# Bug: Problem in my test tooling, not the product: `type` fails for any text that starts with "-" ("command send-keys: invalid flag -"). Because those lines failed, a bare Enter submitted only the first line of the prompt in session 1. To get around it I typed an 'x' in front of each line, then used Home and Delete to remove it.

**Kind:** bug
**Scenario:** triggering-test-driven-development
**Scenario Status:** investigate

## Description

Problem in my test tooling, not the product: `type` fails for any text that starts with "-" ("command send-keys: invalid flag -"). Because those lines failed, a bare Enter submitted only the first line of the prompt in session 1. To get around it I typed an 'x' in front of each line, then used Home and Delete to remove it.
