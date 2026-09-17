# Bug: Namespace mismatch vs. the story: the installed plugin exposes skills under the `hyperpowers:` prefix (e.g. `hyperpowers:executing-plans`), while the acceptance criterion names `superpowers:executing-plans`. No `superpowers:`-prefixed skill exists in the session's skill inventory (grep for 'superpowers:' matched nothing beyond the 'hyperpowers:' substring).

**Kind:** bug
**Scenario:** triggering-executing-plans
**Scenario Status:** fail

## Description

Namespace mismatch vs. the story: the installed plugin exposes skills under the `hyperpowers:` prefix (e.g. `hyperpowers:executing-plans`), while the acceptance criterion names `superpowers:executing-plans`. No `superpowers:`-prefixed skill exists in the session's skill inventory (grep for 'superpowers:' matched nothing beyond the 'hyperpowers:' substring).
