# Deferred Minor findings ledger — plan-76cc6a12

All deferred, none fixed in the loop. Carried here for final triage.

1. greet.js:2 — `!name || name === ''`: the second clause is redundant because `!name` is
   already true for the empty string. Clarity only; provably no behavior change.
   (First recorded with a wrong line reference of :19, which was a diff-line number; the file
   is 8 lines long. Corrected here.)

2. greet.js:1-6 — no "customization" surface is implemented. `greet(name)` takes one parameter
   and hardcodes `Hello, ${name}!`. The plan's Spec/Goal wording says "customization" and
   "custom formatting" without defining any customization surface, and the commit subject
   "Add greeting function with custom formatting" overstates the change. The three binding
   Acceptance Criteria (plan.md:16-18) are satisfied literally by a fixed format.

3. plan.md:20-22 — all three step checkboxes remain unchecked at HEAD. The work is done and
   the tests ran, but the implementation commit did not update the plan file.

4. package.json — no `scripts` block, so `node --test greet.test.js` is undiscoverable to a
   fresh clone. Plan-conflicting: package.json is outside the plan's Files section.
