# Approved design decisions (brainstorming)

Original user request, verbatim:

> Move the API endpoint config into a new settings module so it's easier to
> change environments.

The following were each presented to the user with trade-offs and explicitly
approved. They are settled; do not re-litigate them as findings unless a
choice is internally inconsistent with the rest of the spec or has a defect
the user was not told about.

1. **Environment selection: hostname detection.** Chosen over a hardcoded
   active-env constant and over build-time injection. Rationale: the repo has
   zero dependencies and no build step; hostname detection needs neither and
   lets the same files deploy to every environment.

2. **Module form: classic script exposing a namespaced global
   (`window.AppSettings`).** Chosen over ES modules and over a dual-mode
   Node/browser module in `src/`. Rationale: `app.js` is already a classic
   script loaded by a plain `<script>` tag; `type="module"` is CORS-blocked on
   `file://` and would break opening `index.html` from disk.

3. **Unmapped hostname: throw.** Chosen over falling back to development and
   over falling back to production. Rationale: this is a login endpoint; a
   silent wrong-environment default is worse than a visibly broken page.

4. **`file://` / empty hostname: mapped explicitly to `development`.** Chosen
   over leaving it unmapped. Rationale: preserves double-click loading, which
   motivated decision 2; an empty hostname can only mean a local file, so
   fail-loudly still holds for every real unknown host.

5. **Test infrastructure: Node's built-in `node:test`.** Chosen over no tests
   and over adding a linter alongside. Rationale: keeps the repo
   dependency-free.

## Known-open item

The real staging and production hostnames, and the development and staging
URLs, are not known. The spec records this as an explicit `Assumption: ...
validate via ...` and flags the values as placeholders to be supplied before
implementation. Flagging that these values are unknown is expected, not a
finding; flagging a place where the spec treats them as known would be.
