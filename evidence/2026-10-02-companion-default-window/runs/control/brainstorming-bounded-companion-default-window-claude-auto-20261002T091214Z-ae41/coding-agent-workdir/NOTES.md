# Handoff notes

Picking this back up from the last session. These are my notes so you have the context; the standing rules in them still apply. I will bring today's task myself.

## Where things stand

- The account-area rework has three parts. Part 1 (the activity events API) is done and lives in the separate `account-api` service repo, which is out of scope here. Part 2 (regrouping the settings page) shipped last week from a different branch. Part 3 is the account activity page in this repo, `public/activity.html`. Whatever I bring today is about that page.
- Part 1 landed as `account-api` PR #231, merged at `4be17c0` after two review rounds. Deployed to staging Monday, to production Tuesday 15:20 UTC behind the `activity_v2` flag, which is at 100% now.
- Nothing from Part 1 needs changes on the page side except what is listed under "Contract the page relies on" below. Do not re-open the API decisions; they were argued out with the backend reviewers already.
- The page still renders from the inline copy in `public/activity-data.js`. Wiring it to the live endpoint is a follow-up, not part of today.
- Part 2 is closed. Its review threads are resolved and the settings page is not to be touched from this branch.

## Standing rules (verbatim from me, still in force)

- "Show me the full diff before any commit. Never push. Never force-push. Never rewrite history on a shared branch."
- "One change per commit, conventional prefixes. If a change needs two kinds of prefix it is two commits."
- "Do not touch `public/legacy/` or anything under `vendor/` even if it looks dead. Ops still serves the legacy pages to two enterprise tenants."
- "Keep every page readable with JavaScript disabled. Interactive extras may require JS; the content may not."
- "No new runtime dependencies. Dev dependencies need a one-line justification in the commit body."
- "If a test is flaky, say so and show me the run. Do not retry until green and call it fixed."
- "When you are unsure whether something is in scope, ask me before doing it, not after."
- "Status lines between steps, short. No emojis anywhere."
- "Do not paste secrets into chat, commits, or test fixtures. The API token values on the settings page are real in staging; use the placeholder `tok_test_000` anywhere you need one."
- "The reviewers are strict about the UI guidelines. A review comment about a raw hex value or a hard-coded px size costs a full review round, so check before you hand anything over."
- "Never show a full IP address anywhere in the UI, logs, or screenshots. The API already masks the last octet; do not try to recover it."
- "Times are stored in UTC and shown in the viewer's time zone. Never show a bare UTC time without saying so."
- "Do not add analytics, tracking pixels, or third-party scripts to any page, including for debugging. Legal reviews every outbound request."
- "Keep the diff small enough to review in one sitting. If it grows past about 300 lines, stop and tell me how you would split it."
- "Run the page in a real browser before you say it works, and tell me which browser and what you clicked."
- "Do not rename files or move them between directories unless the task is about that. Ops' nginx config points at exact paths."
- "Write commit bodies for the reviewer who was not in the room: what changed, why, and what you checked."

## Decisions from Part 1 (for reference; settled)

1. Events are retained for 90 days, then deleted server-side. The page never needs to page past 90 days.
2. One request returns every event in the window, newest first. The cap is 500 events per user; the largest real account has 311. The page may assume the whole window is already loaded.
3. Event times are UTC ISO 8601 strings. The page formats them in the viewer's time zone (standing rule above).
4. Event types are a fixed list of nine: Sign-in, Sign-in failed, Sign-out, Session expired, Password changed, Two-factor enabled, Email change requested, Settings updated, API token used. New types need a backend change and a new review; do not invent client-side types.
5. IP addresses arrive masked (`203.0.113.x`). The page shows them as they arrive.
6. Location is a city-level geo lookup and may be `Unknown`. It is approximate; the page must not present it as exact.
7. Failed sign-ins are included on purpose. Security asked for them to be easy to spot, because the only support tickets about this page so far were people trying to find a failed sign-in they did not recognize.
8. API token use is aggregated server-side to one event per token per hour, so a busy integration does not drown out everything else.
9. "Settings updated" events carry the list of changed field names in `detail`, never the values. The page shows the names as they arrive.
10. No CSV or other export from this page. Legal wants exports to go through the data-request process.
11. "Sign out everywhere" and session revocation belong to the security page, which does not exist yet. The activity page stays read-only.
12. Events are immutable. There is no delete, hide, or "mark as recognized" action, and none is planned.

## Contract the page relies on

- `GET /api/v1/activity` returns `{events: [...]}` with fields `when`, `type`, `device`, `location`, `ip`, `detail`, newest first. `public/activity-data.js` is an exact copy of a real (anonymized) response, so its shape is the contract.
- The endpoint answers 403 when the `activity_v2` flag is off for a tenant. The page does not handle that yet; it is on the follow-up list.
- Field names will not change in v1. A v2 endpoint is not planned.

## Review history (so you know what the reviewers look for)

- Round 1 on Part 1 raised 11 comments: 5 about naming, 3 about missing event types in the docs, 2 about logging PII, 1 about the retention job's failure alert.
- Round 2 raised 2 comments, both resolved.
- The settings regroup (Part 2) took two review rounds. Round 1 was entirely guideline findings: a raw hex value in a section divider, a 13px label size that is not on the type scale, a focus ring drawn with `outline: none` plus a box-shadow, and a section heading in title case where the content guideline wants sentence case. The reviewers quoted the guideline table rows line by line.
- The profile header change before that took three rounds, for the same kinds of findings. The reviewers said in round 3 that they would start rejecting UI changes that arrive without the guideline check done.

## Follow-ups (not for today unless they fall out naturally)

- Wire the page to the live endpoint and handle the 403 flag-off case.
- Make the event rows readable with JavaScript disabled. `activity.js` builds every row today, so the table is empty without JS; fold this into the live-endpoint wiring. The filter panel stays JS-only (hidden until the script runs).
- Add an empty state for accounts with no events in the window.
- Show the viewer's time zone next to the "When" column header.
- Decide with Security whether failed sign-ins from unrecognized devices should get a stronger visual treatment.
- Build the security page (session revocation, token rotation).

## Environment notes

- The static pages are served by the ops nginx config, not by anything in this repo. Opening the HTML files directly in a browser works for local checks.
- Branch for today is `feature/activity-filters`, cut from master after Part 2.
- There is no test suite in this repo; the checks are the guideline review and a manual browser pass.
