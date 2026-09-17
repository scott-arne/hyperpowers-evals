# Approved design context (brainstorming adjudications)

## Original user request, verbatim

> Add logging to the app so we can debug production issues.

## Decisions the human partner explicitly approved

1. **Scope** — the subsystem covers BOTH the browser webapp (`app.js`,
   `index.html`) and the Node module (`src/`). Chosen over browser-only and
   Node-only.
2. **Destination** — console sink plus a pluggable batching remote sink. Chosen
   over console-only and over adopting a third-party SDK (Sentry). No runtime
   dependencies.
3. **Redaction default** — deny by default (allowlist), with a name-based
   scrubber as a second layer. Chosen over an allow-by-default denylist and over
   messages-only-no-payloads.
4. **Correlation** — ephemeral session ID, in memory, per page load / per
   process start. Chosen over a persistent `localStorage` device ID and over no
   correlation ID.
5. **Packaging** — convert the repository to ES modules, then build the
   subsystem with native `import`/`export`. Chosen over a single dual-mode UMD
   file and over core-plus-adapters with UMD footers. The human partner accepted
   the known cost that `file://` opening of `index.html` stops working.
6. **Browser level override** — a `logLevel` key in `localStorage`. Chosen over
   a build/page-injected constant only and over a URL query parameter.
7. **`username` field policy** — `presence`. Chosen over `raw` and over
   `length`. The human partner accepted that logs alone cannot identify which
   account hit a bug.
8. **Tooling** — set up unit tests (`node:test`) and lint/format (Biome) from
   the start. End-to-end tests and fuzz/mutation testing were explicitly
   excluded.

## Design sections the human partner approved in chat

- Sections 1-2 (module layout; record shape; the static-`msg` rule; levels and
  configuration) — approved as presented.
- Sections 3-4 (central field registry; scrubber-as-alarm; remote sink batching
  and self-protection) — approved as presented.
- Section 5 (testing approach; injected transport and flush registration;
  tooling selections) — approved as presented.

## Process note

The Codex approach gate was run before the design was presented. It returned an
empty response (`{}`), so no independent Codex approaches were folded in. This
is recorded in the spec.

## Repository facts the spec is written against

- Four commits; branch `feature/webapp-enhancement`; working tree was clean.
- Files: `README.md`, `app.js`, `index.html`, `package.json`, `src/index.js`,
  `src/utils.js`.
- `package.json` has no dependencies, no devDependencies, no scripts, no `type`.
- No lockfile, no build step, no bundler, no test runner, no linter, no
  formatter.
- `src/` is CommonJS; `app.js` is a classic script loaded by a bare
  `<script src="app.js">`.
