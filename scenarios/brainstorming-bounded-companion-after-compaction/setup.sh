#!/usr/bin/env bash

# Fixture: a bounded feature on an existing page (filtering an account
# activity table), shaped after the field brainstorm it reproduces, plus the
# conditions under which that brainstorm lost the visual companion.
#
# In the field (2026-09, three brainstorms in one long session) the first
# visual question went to AskUserQuestion after an auto-compaction landed
# between the brainstorming skill load and that question. Two things were
# lost together. First, Claude Code re-attaches an invoked skill truncated to
# 20000 characters; the brainstorming SKILL.md is about 23300, and the cut
# falls inside the Visual Companion section, so the pointer to
# visual-companion.md (where the start-server.sh command lives) is gone.
# Second, every field compaction summary carried a compressed brainstorming
# checklist WITHOUT the visual-companion step, and the agent followed the
# summary's plan. An earlier version of this fixture (the settings-page
# relayout brief, no handoff notes) compacted between the skill load and the
# companion start in all four pilots (before the first question in three),
# but the summaries examined kept the companion step verbatim and every pilot
# opened the companion. This version adds the two field conditions that
# version lacked:
#
# - A feature-shaped request. The field brief was a page that "doesn't allow"
#   something (browsing results), and the layout question arose inside it,
#   next to filtering and grouping questions. Here the brief asks for a way
#   to narrow down a long activity table; the layout of the filter controls
#   is the visual question.
# - Durable state the summary has to carry. The field summaries ran 14k to
#   20k characters, dominated by verbatim standing rules and settled
#   decisions. NOTES.md is a handoff note of that kind, and the fixture
#   CLAUDE.md requires reading it at session start.
#
# The window: .claude/settings.json sets autoCompactWindow to 100000, the
# smallest window Claude Code accepts (smaller values are ignored). Compaction
# then fires at about 67k context tokens. A quorum session sits near 27k once
# the skill has loaded; NOTES.md and the page add about 5k, and the four
# guideline docs (about 48k tokens together, 9k to 18k each, read because the
# fixture CLAUDE.md requires it before any page change) carry it past the
# threshold. Each doc is larger than the roughly 5k-token limit for
# re-attaching a read file after compaction, so the docs come back as file
# references, not contents, and the post-compaction context stays well under
# the threshold.
#
# brainstorming-bounded-companion-default-window runs this script with
# COMPANION_NO_WINDOW=1 and gets the same fixture without the settings file,
# so Claude Code's default window applies. Comparing the two separates the
# compaction from the brief and the handoff note.
#
# Regenerated deterministically on every run; nothing here is random.

setup-helpers run create_base_repo
git checkout -b feature/activity-filters

mkdir -p public .claude docs/ui-guidelines

cat > public/activity.html <<'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Account activity</title>
  <link rel="stylesheet" href="activity.css">
</head>
<body>
  <main class="activity">
    <h1>Account activity</h1>
    <p class="intro">Every sign-in and account change from the last 90 days, newest first.</p>

    <table id="activity-table">
      <thead>
        <tr>
          <th>When</th>
          <th>Event</th>
          <th>Device</th>
          <th>Location</th>
          <th>IP</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  </main>
  <script src="activity-data.js"></script>
  <script src="activity.js"></script>
</body>
</html>
HTML

cat > public/activity.css <<'CSS'
body {
  font-family: system-ui, sans-serif;
  margin: 0;
  background: #f6f7f9;
}

.activity {
  max-width: 960px;
  margin: 3rem auto;
  padding: 2rem;
  background: #fff;
  border-radius: 8px;
}

.activity h1 {
  margin-top: 0;
  font-size: 1.5rem;
}

#activity-table {
  width: 100%;
  border-collapse: collapse;
}

#activity-table th,
#activity-table td {
  text-align: left;
  padding: 0.5rem;
  border-bottom: 1px solid #e3e5e8;
}
CSS

cat > public/activity-data.js <<'JS'
// Inline copy of GET /api/v1/activity until the page is wired to the API.
// Newest first, as the API returns it.
window.ACTIVITY_EVENTS = [
  { when: '2026-09-28T17:42Z', type: 'Sign-in', device: 'Chrome on macOS', location: 'Lisbon, PT', ip: '203.0.113.x', detail: '' },
  { when: '2026-09-28T09:29Z', type: 'Sign-in', device: 'Safari on iPhone', location: 'Porto, PT', ip: '203.0.113.x', detail: '' },
  { when: '2026-09-27T23:16Z', type: 'Two-factor enabled', device: 'Chrome on macOS', location: 'Lisbon, PT', ip: '203.0.113.x', detail: '' },
  { when: '2026-09-27T16:03Z', type: 'Sign-in failed', device: 'Firefox on Windows', location: 'Unknown', ip: '192.0.2.x', detail: '' },
  { when: '2026-09-27T11:50Z', type: 'Password changed', device: 'Chrome on macOS', location: 'Lisbon, PT', ip: '203.0.113.x', detail: '' },
  { when: '2026-09-27T06:37Z', type: 'Settings updated', device: 'Chrome on macOS', location: 'Lisbon, PT', ip: '203.0.113.x', detail: 'notifyDigest' },
  { when: '2026-09-26T22:24Z', type: 'Session expired', device: 'Chrome on macOS', location: 'Lisbon, PT', ip: '203.0.113.x', detail: '' },
  { when: '2026-09-26T12:11Z', type: 'Email change requested', device: 'Safari on iPhone', location: 'Porto, PT', ip: '203.0.113.x', detail: '' },
  { when: '2026-09-26T04:58Z', type: 'Sign-out', device: 'Safari on iPhone', location: 'Porto, PT', ip: '203.0.113.x', detail: '' },
  { when: '2026-09-26T00:45Z', type: 'Sign-in failed', device: 'Chrome on Android', location: 'Madrid, ES', ip: '192.0.2.x', detail: '' },
  { when: '2026-09-25T19:32Z', type: 'API token used', device: 'API client', location: 'Frankfurt, DE', ip: '198.51.100.x', detail: '' },
  { when: '2026-09-25T11:19Z', type: 'API token used', device: 'API client', location: 'Frankfurt, DE', ip: '198.51.100.x', detail: '' },
  { when: '2026-09-25T01:06Z', type: 'Sign-in', device: 'Chrome on macOS', location: 'Lisbon, PT', ip: '203.0.113.x', detail: '' },
  { when: '2026-09-24T17:53Z', type: 'Sign-in', device: 'Safari on iPhone', location: 'Porto, PT', ip: '203.0.113.x', detail: '' },
  { when: '2026-09-24T14:40Z', type: 'Two-factor enabled', device: 'Chrome on macOS', location: 'Lisbon, PT', ip: '203.0.113.x', detail: '' },
  { when: '2026-09-24T08:27Z', type: 'Sign-in failed', device: 'Firefox on Windows', location: 'Unknown', ip: '192.0.2.x', detail: '' },
  { when: '2026-09-24T00:14Z', type: 'Password changed', device: 'Chrome on macOS', location: 'Lisbon, PT', ip: '203.0.113.x', detail: '' },
  { when: '2026-09-23T14:01Z', type: 'Settings updated', device: 'Chrome on macOS', location: 'Lisbon, PT', ip: '203.0.113.x', detail: 'notifyDigest' },
  { when: '2026-09-23T06:48Z', type: 'Session expired', device: 'Chrome on macOS', location: 'Lisbon, PT', ip: '203.0.113.x', detail: '' },
  { when: '2026-09-23T03:35Z', type: 'Email change requested', device: 'Safari on iPhone', location: 'Porto, PT', ip: '203.0.113.x', detail: '' },
  { when: '2026-09-22T21:22Z', type: 'Sign-out', device: 'Safari on iPhone', location: 'Porto, PT', ip: '203.0.113.x', detail: '' },
  { when: '2026-09-22T13:09Z', type: 'Sign-in failed', device: 'Chrome on Android', location: 'Madrid, ES', ip: '192.0.2.x', detail: '' },
  { when: '2026-09-22T02:56Z', type: 'API token used', device: 'API client', location: 'Frankfurt, DE', ip: '198.51.100.x', detail: '' },
  { when: '2026-09-21T19:43Z', type: 'API token used', device: 'API client', location: 'Frankfurt, DE', ip: '198.51.100.x', detail: '' },
  { when: '2026-09-21T16:30Z', type: 'Sign-in', device: 'Chrome on macOS', location: 'Lisbon, PT', ip: '203.0.113.x', detail: '' },
  { when: '2026-09-21T10:17Z', type: 'Sign-in', device: 'Safari on iPhone', location: 'Porto, PT', ip: '203.0.113.x', detail: '' },
  { when: '2026-09-21T02:04Z', type: 'Two-factor enabled', device: 'Chrome on macOS', location: 'Lisbon, PT', ip: '203.0.113.x', detail: '' },
  { when: '2026-09-20T15:51Z', type: 'Sign-in failed', device: 'Firefox on Windows', location: 'Unknown', ip: '192.0.2.x', detail: '' },
  { when: '2026-09-20T09:38Z', type: 'Password changed', device: 'Chrome on macOS', location: 'Lisbon, PT', ip: '203.0.113.x', detail: '' },
  { when: '2026-09-20T05:25Z', type: 'Settings updated', device: 'Chrome on macOS', location: 'Lisbon, PT', ip: '203.0.113.x', detail: 'notifyDigest' },
  { when: '2026-09-19T23:12Z', type: 'Session expired', device: 'Chrome on macOS', location: 'Lisbon, PT', ip: '203.0.113.x', detail: '' },
  { when: '2026-09-19T14:59Z', type: 'Email change requested', device: 'Safari on iPhone', location: 'Porto, PT', ip: '203.0.113.x', detail: '' },
  { when: '2026-09-19T04:46Z', type: 'Sign-out', device: 'Safari on iPhone', location: 'Porto, PT', ip: '203.0.113.x', detail: '' },
  { when: '2026-09-18T22:33Z', type: 'Sign-in failed', device: 'Chrome on Android', location: 'Madrid, ES', ip: '192.0.2.x', detail: '' },
  { when: '2026-09-18T18:20Z', type: 'API token used', device: 'API client', location: 'Frankfurt, DE', ip: '198.51.100.x', detail: '' },
  { when: '2026-09-18T12:07Z', type: 'API token used', device: 'API client', location: 'Frankfurt, DE', ip: '198.51.100.x', detail: '' },
  { when: '2026-09-18T03:54Z', type: 'Sign-in', device: 'Chrome on macOS', location: 'Lisbon, PT', ip: '203.0.113.x', detail: '' },
  { when: '2026-09-17T18:41Z', type: 'Sign-in', device: 'Safari on iPhone', location: 'Porto, PT', ip: '203.0.113.x', detail: '' },
  { when: '2026-09-17T11:28Z', type: 'Two-factor enabled', device: 'Chrome on macOS', location: 'Lisbon, PT', ip: '203.0.113.x', detail: '' },
  { when: '2026-09-17T07:15Z', type: 'Sign-in failed', device: 'Firefox on Windows', location: 'Unknown', ip: '192.0.2.x', detail: '' },
  { when: '2026-09-17T01:02Z', type: 'Password changed', device: 'Chrome on macOS', location: 'Lisbon, PT', ip: '203.0.113.x', detail: '' },
  { when: '2026-09-16T16:49Z', type: 'Settings updated', device: 'Chrome on macOS', location: 'Lisbon, PT', ip: '203.0.113.x', detail: 'notifyDigest' },
  { when: '2026-09-16T07:36Z', type: 'Session expired', device: 'Chrome on macOS', location: 'Lisbon, PT', ip: '203.0.113.x', detail: '' },
  { when: '2026-09-16T00:23Z', type: 'Email change requested', device: 'Safari on iPhone', location: 'Porto, PT', ip: '203.0.113.x', detail: '' },
  { when: '2026-09-15T20:10Z', type: 'Sign-out', device: 'Safari on iPhone', location: 'Porto, PT', ip: '203.0.113.x', detail: '' },
  { when: '2026-09-15T13:57Z', type: 'Sign-in failed', device: 'Chrome on Android', location: 'Madrid, ES', ip: '192.0.2.x', detail: '' },
  { when: '2026-09-15T05:44Z', type: 'API token used', device: 'API client', location: 'Frankfurt, DE', ip: '198.51.100.x', detail: '' },
  { when: '2026-09-14T20:31Z', type: 'API token used', device: 'API client', location: 'Frankfurt, DE', ip: '198.51.100.x', detail: '' },
];
JS

cat > public/activity.js <<'JS'
// Renders every event as one table row, in API order.
const tbody = document.querySelector('#activity-table tbody');
for (const event of window.ACTIVITY_EVENTS) {
  const row = document.createElement('tr');
  for (const value of [
    new Date(event.when).toLocaleString(),
    event.type,
    event.device,
    event.location,
    event.ip,
    event.detail,
  ]) {
    const cell = document.createElement('td');
    cell.textContent = value;
    row.appendChild(cell);
  }
  tbody.appendChild(row);
}
JS

cat > NOTES.md <<'MD'
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
- Add an empty state for accounts with no events in the window.
- Show the viewer's time zone next to the "When" column header.
- Decide with Security whether failed sign-ins from unrecognized devices should get a stronger visual treatment.
- Build the security page (session revocation, token rotation).

## Environment notes

- The static pages are served by the ops nginx config, not by anything in this repo. Opening the HTML files directly in a browser works for local checks.
- Branch for today is `feature/activity-filters`, cut from master after Part 2.
- There is no test suite in this repo; the checks are the guideline review and a manual browser pass.
MD

cat > CLAUDE.md <<'MD'
# Project notes

A small web app. Static pages live under `public/`; the API that backs them
is a separate service and is out of scope for this repo.

## Session start

Read `NOTES.md` in full before you start on anything. It holds my handoff
notes from the previous session, and the standing rules in it are in force.

## UI work

Every page under `public/` follows the UI guidelines in `docs/ui-guidelines/`.
Before you propose or make any change to a page's markup or styles, read all
four guideline files in full, 01 through 04, yourself. Reviewers check new UI
against the token tables and component specs line by line.

## Commits

Conventional commit prefixes (`feat:`, `fix:`, `docs:`). One change per commit.
MD

if [ -z "${COMPANION_NO_WINDOW:-}" ]; then
cat > .claude/settings.json <<'JSON'
{
  "autoCompactWindow": 100000
}
JSON
fi

G=docs/ui-guidelines

# --- 01-foundations.md ------------------------------------------------------

hues=(slate gray red orange amber green teal cyan blue indigo violet pink)
rgb=("100 116 139" "107 114 128" "239 68 68" "249 115 22" "245 158 11"
  "34 197 94" "20 184 166" "6 182 212" "59 130 246" "99 102 241"
  "139 92 246" "236 72 153")
shades=(50 100 200 300 400 500 600 700 800 900 950)
mix=(95 90 75 60 40 0 15 30 45 60 75)
uses=("Page and panel backgrounds" "Hover backgrounds on light surfaces"
  "Dividers and subtle borders" "Input borders, disabled text"
  "Placeholder text and secondary icons" "Reference fill, focus rings"
  "Hover state for filled controls" "Pressed state, text on tints"
  "Headings on tinted surfaces" "High-emphasis text"
  "Text on the darkest surfaces")

hex() {
  local r=$1 g=$2 b=$3 i=$4 f=${mix[$4]}
  if [ "$i" -lt 5 ]; then
    r=$(( r + (255 - r) * f / 100 )); g=$(( g + (255 - g) * f / 100 )); b=$(( b + (255 - b) * f / 100 ))
  elif [ "$i" -gt 5 ]; then
    r=$(( r * (100 - f) / 100 )); g=$(( g * (100 - f) / 100 )); b=$(( b * (100 - f) / 100 ))
  fi
  printf '#%02x%02x%02x' "$r" "$g" "$b"
}

{
  cat <<'MD'
# 01 Foundations

These are the design tokens every page under `public/` draws from. Pages
reference tokens through CSS custom properties declared in the shared token
sheet; a raw hex value, pixel size, or duration in a page stylesheet is a
review comment. When a value you need is missing, add a token here first, then
reference it.

Tokens come in two layers. Palette tokens name a raw value and never carry
meaning. Semantic tokens name a role (surface, border, text, accent, state) and
point at a palette token per theme. Page CSS uses semantic tokens; palette
tokens appear only in this file and in the token sheet.

## Color palette

Twelve hues, eleven steps each. Steps below 500 are tints for surfaces and
borders; 500 is the reference fill; steps above 500 are for text and pressed
states. Contrast pairs that pass WCAG AA are listed under Semantic colors; do
not invent new pairings in page CSS.

| Token | Value | Typical use |
|---|---|---|
MD
  for h in "${!hues[@]}"; do
    read -r r g b <<< "${rgb[$h]}"
    for i in "${!shades[@]}"; do
      printf '| `--color-%s-%s` | `%s` | %s |\n' "${hues[$h]}" "${shades[$i]}" "$(hex "$r" "$g" "$b" "$i")" "${uses[$i]}"
    done
  done
  cat <<'MD'

## Semantic colors

Each semantic token resolves to a palette token per theme. The dark theme is
not shipped yet, but its column is maintained so that pages written today do
not need a second pass.

| Token | Light | Dark | Role |
|---|---|---|---|
| `--surface-page` | `slate-50` | `slate-950` | The page background behind every panel |
| `--surface-panel` | `#ffffff` | `slate-900` | Primary content panels |
| `--surface-raised` | `#ffffff` | `slate-800` | Menus, popovers, dialogs |
| `--surface-sunken` | `slate-100` | `slate-950` | Wells, code blocks, read-only fields |
| `--surface-hover` | `slate-100` | `slate-800` | Row and item hover |
| `--surface-selected` | `blue-50` | `blue-900` | Selected rows, active navigation items |
| `--surface-inverse` | `slate-900` | `slate-50` | Tooltips, toasts |
| `--border-subtle` | `slate-200` | `slate-800` | Dividers between related items |
| `--border-default` | `slate-300` | `slate-700` | Input borders, panel outlines |
| `--border-strong` | `slate-400` | `slate-600` | Borders that must read at a glance |
| `--border-focus` | `blue-500` | `blue-400` | Focus ring, 2px, offset 2px |
| `--text-primary` | `slate-900` | `slate-50` | Body text, headings |
| `--text-secondary` | `slate-600` | `slate-300` | Helper text, metadata |
| `--text-tertiary` | `slate-500` | `slate-400` | Placeholders, timestamps |
| `--text-disabled` | `slate-400` | `slate-600` | Disabled labels and values |
| `--text-inverse` | `#ffffff` | `slate-900` | Text on inverse and filled surfaces |
| `--text-link` | `blue-600` | `blue-400` | Inline links |
| `--text-link-hover` | `blue-700` | `blue-300` | Inline link hover |
| `--accent-fill` | `blue-600` | `blue-500` | Primary buttons, checked controls |
| `--accent-fill-hover` | `blue-700` | `blue-400` | Primary button hover |
| `--accent-fill-pressed` | `blue-800` | `blue-300` | Primary button pressed |
| `--accent-subtle` | `blue-50` | `blue-950` | Accent backgrounds, info banners |
| `--danger-fill` | `red-600` | `red-500` | Destructive buttons |
| `--danger-fill-hover` | `red-700` | `red-400` | Destructive button hover |
| `--danger-text` | `red-700` | `red-300` | Error messages, invalid field text |
| `--danger-subtle` | `red-50` | `red-950` | Error banners, invalid field background |
| `--warning-text` | `amber-800` | `amber-300` | Warning messages |
| `--warning-subtle` | `amber-50` | `amber-950` | Warning banners |
| `--success-text` | `green-700` | `green-300` | Success messages |
| `--success-subtle` | `green-50` | `green-950` | Success banners |
| `--info-text` | `blue-700` | `blue-300` | Informational messages |
| `--info-subtle` | `blue-50` | `blue-950` | Informational banners |
| `--overlay-scrim` | `slate-900` at 48% | `slate-950` at 64% | Behind dialogs |

Approved contrast pairs (AA for body text): `--text-primary` on every surface
token; `--text-secondary` on `--surface-page`, `--surface-panel`,
`--surface-raised`; `--text-inverse` on `--accent-fill`, `--danger-fill`,
`--surface-inverse`. `--text-tertiary` passes AA only for large text and is
never used for content a user must read to complete a task.

## Spacing

One scale, used for padding, gaps, and margins alike. Steps are named by index,
not by size, so that the scale can be retuned without renaming.

| Token | rem | px | Typical use |
|---|---|---|---|
| `--space-0` | 0 | 0 | Resetting inherited spacing |
| `--space-1` | 0.125 | 2 | Hairline offsets, icon nudges |
| `--space-2` | 0.25 | 4 | Gap between an icon and its label |
| `--space-3` | 0.375 | 6 | Padding inside badges and chips |
| `--space-4` | 0.5 | 8 | Gap between a label and its control |
| `--space-5` | 0.75 | 12 | Vertical gap between stacked fields |
| `--space-6` | 1 | 16 | Padding inside inputs and small cards |
| `--space-7` | 1.25 | 20 | Gap between buttons in a button row |
| `--space-8` | 1.5 | 24 | Padding inside panels |
| `--space-9` | 2 | 32 | Gap between panels |
| `--space-10` | 2.5 | 40 | Page gutter on tablet |
| `--space-11` | 3 | 48 | Page gutter on desktop |
| `--space-12` | 4 | 64 | Top margin above a page title |
| `--space-13` | 5 | 80 | Empty-state padding |
| `--space-14` | 6 | 96 | Marketing sections only |
| `--space-15` | 8 | 128 | Marketing sections only |

## Typography

One family for interface text and one for code. Sizes are set in rem so they
follow the user's browser setting.

| Role | Token | Size (rem) | Line height | Weight | Tracking |
|---|---|---|---|---|---|
| Display | `--type-display` | 2.25 | 1.15 | 700 | -0.02em |
| Page title | `--type-title` | 1.5 | 1.25 | 650 | -0.01em |
| Heading 2 | `--type-h2` | 1.25 | 1.3 | 600 | -0.005em |
| Heading 3 | `--type-h3` | 1.0625 | 1.35 | 600 | 0 |
| Heading 4 | `--type-h4` | 0.9375 | 1.4 | 600 | 0.01em |
| Body large | `--type-body-lg` | 1.0625 | 1.6 | 400 | 0 |
| Body | `--type-body` | 0.9375 | 1.55 | 400 | 0 |
| Body small | `--type-body-sm` | 0.8125 | 1.5 | 400 | 0.005em |
| Label | `--type-label` | 0.875 | 1.4 | 500 | 0 |
| Caption | `--type-caption` | 0.75 | 1.4 | 400 | 0.01em |
| Overline | `--type-overline` | 0.6875 | 1.3 | 600 | 0.08em |
| Code | `--type-code` | 0.8125 | 1.5 | 400 | 0 |

Families: `--font-sans` is `"Inter", system-ui, -apple-system, "Segoe UI",
sans-serif`; `--font-mono` is `"JetBrains Mono", ui-monospace, "SF Mono",
Menlo, monospace`. Numbers in tables use `font-variant-numeric: tabular-nums`.

## Radii

| Token | Value | Use |
|---|---|---|
| `--radius-none` | 0 | Tables, full-bleed surfaces |
| `--radius-sm` | 4px | Badges, checkboxes, small inputs |
| `--radius-md` | 6px | Inputs, buttons |
| `--radius-lg` | 8px | Panels, cards |
| `--radius-xl` | 12px | Dialogs |
| `--radius-full` | 9999px | Pills, avatars, switches |

## Elevation

| Token | Value | Use |
|---|---|---|
| `--shadow-0` | none | Flat surfaces |
| `--shadow-1` | `0 1px 2px rgb(15 23 42 / 0.06)` | Panels on the page background |
| `--shadow-2` | `0 2px 6px rgb(15 23 42 / 0.08)` | Raised cards, sticky headers |
| `--shadow-3` | `0 8px 24px rgb(15 23 42 / 0.12)` | Menus, popovers |
| `--shadow-4` | `0 16px 48px rgb(15 23 42 / 0.18)` | Dialogs |

## Layers

| Token | Value | Use |
|---|---|---|
| `--z-base` | 0 | Page content |
| `--z-sticky` | 100 | Sticky headers and footers |
| `--z-dropdown` | 200 | Menus and popovers |
| `--z-overlay` | 300 | Dialog scrims |
| `--z-dialog` | 310 | Dialogs |
| `--z-toast` | 400 | Toasts |
| `--z-tooltip` | 500 | Tooltips |

## Motion

| Token | Value | Use |
|---|---|---|
| `--duration-instant` | 50ms | Checkbox and switch state changes |
| `--duration-fast` | 120ms | Hover and focus transitions |
| `--duration-base` | 200ms | Expanding and collapsing |
| `--duration-slow` | 320ms | Dialogs entering |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Most transitions |
| `--ease-enter` | `cubic-bezier(0, 0, 0, 1)` | Elements entering |
| `--ease-exit` | `cubic-bezier(0.3, 0, 1, 1)` | Elements leaving |

Every transition is disabled under `prefers-reduced-motion: reduce`.

## Breakpoints and grid

| Token | Min width | Columns | Gutter | Page margin |
|---|---|---|---|---|
| `--bp-xs` | 0 | 4 | 16px | 16px |
| `--bp-sm` | 480px | 4 | 16px | 20px |
| `--bp-md` | 768px | 8 | 24px | 32px |
| `--bp-lg` | 1024px | 12 | 24px | 40px |
| `--bp-xl` | 1280px | 12 | 32px | 48px |
| `--bp-2xl` | 1536px | 12 | 32px | auto, content capped at 1280px |

## Borders, icons, and opacity

| Token | Value | Use |
|---|---|---|
| `--border-width-hairline` | 1px | Dividers, panel outlines, input borders |
| `--border-width-thick` | 2px | Focus rings, selected cards, invalid inputs |
| `--border-width-heavy` | 4px | The active-tab indicator and left accents on banners |
| `--icon-xs` | 12px | Inline with caption text |
| `--icon-sm` | 16px | Inline with body text, inside small buttons |
| `--icon-md` | 20px | Default for buttons and inputs |
| `--icon-lg` | 24px | Navigation and empty-state accents |
| `--icon-xl` | 40px | Empty-state illustrations |
| `--opacity-disabled` | 0.48 | Only for imagery; disabled text uses `--text-disabled` |
| `--opacity-scrim` | 0.48 | Dialog scrim in the light theme |
| `--opacity-hover-overlay` | 0.04 | Hover overlay on images and avatars |
| `--opacity-pressed-overlay` | 0.08 | Pressed overlay on images and avatars |

## Data visualization

Charts use a separate categorical sequence so that series never borrow state
colors (a red series reads as an error). Use the sequence in order; past eight
series, group the remainder into "Other".

| Token | Light | Dark | Order |
|---|---|---|---|
| `--chart-1` | `blue-600` | `blue-400` | First series |
| `--chart-2` | `teal-600` | `teal-400` | Second series |
| `--chart-3` | `violet-600` | `violet-400` | Third series |
| `--chart-4` | `amber-600` | `amber-400` | Fourth series |
| `--chart-5` | `pink-600` | `pink-400` | Fifth series |
| `--chart-6` | `cyan-700` | `cyan-300` | Sixth series |
| `--chart-7` | `indigo-700` | `indigo-300` | Seventh series |
| `--chart-8` | `slate-500` | `slate-400` | Eighth series, and "Other" |
| `--chart-grid` | `slate-200` | `slate-800` | Gridlines |
| `--chart-axis` | `slate-500` | `slate-400` | Axis labels and ticks |
| `--chart-sequential-low` | `blue-50` | `blue-950` | Low end of a heatmap |
| `--chart-sequential-high` | `blue-800` | `blue-300` | High end of a heatmap |

## Token use by surface

The table below is the reference reviewers use when they check a surface.
Every cell names the token; nothing in a page stylesheet should contradict it.

| Surface | Background | Border | Text | Radius | Shadow | Padding |
|---|---|---|---|---|---|---|
| Page | `--surface-page` | none | `--text-primary` | `--radius-none` | `--shadow-0` | `--space-11` |
| Panel | `--surface-panel` | `--border-subtle` | `--text-primary` | `--radius-lg` | `--shadow-1` | `--space-8` |
| Card | `--surface-panel` | `--border-subtle` | `--text-primary` | `--radius-lg` | `--shadow-1` | `--space-6` |
| Input | `--surface-panel` | `--border-default` | `--text-primary` | `--radius-md` | `--shadow-0` | `--space-4` `--space-5` |
| Read-only field | `--surface-sunken` | `--border-subtle` | `--text-secondary` | `--radius-md` | `--shadow-0` | `--space-4` `--space-5` |
| Menu | `--surface-raised` | `--border-subtle` | `--text-primary` | `--radius-lg` | `--shadow-3` | `--space-2` |
| Dialog | `--surface-raised` | none | `--text-primary` | `--radius-xl` | `--shadow-4` | `--space-8` |
| Toast | `--surface-inverse` | none | `--text-inverse` | `--radius-lg` | `--shadow-3` | `--space-5` `--space-6` |
| Tooltip | `--surface-inverse` | none | `--text-inverse` | `--radius-sm` | `--shadow-2` | `--space-2` `--space-4` |
| Table header | `--surface-sunken` | `--border-default` | `--text-secondary` | `--radius-none` | `--shadow-0` | `--space-4` `--space-6` |
| Table row | `--surface-panel` | `--border-subtle` | `--text-primary` | `--radius-none` | `--shadow-0` | `--space-4` `--space-6` |
| Banner | state `-subtle` | none | state `-text` | `--radius-md` | `--shadow-0` | `--space-5` `--space-6` |
| Sticky footer | `--surface-panel` | `--border-subtle` | `--text-primary` | `--radius-none` | `--shadow-2` | `--space-5` `--space-8` |
MD
} > "$G/01-foundations.md"

# --- 02-components.md -------------------------------------------------------

states=(default hover focus-visible active disabled invalid)

# component_section <name> <purpose> <anatomy> <bg> <border> <text> <props...>
# Each prop is "name|type|default|description".
component_section() {
  local name=$1 purpose=$2 anatomy=$3 bg=$4 border=$5 text=$6
  shift 6
  printf '## %s\n\n%s\n\n**Anatomy:** %s.\n\n' "$name" "$purpose" "$anatomy"
  printf '| Prop | Type | Default | Description |\n|---|---|---|---|\n'
  local p n t d desc
  for p in "$@"; do
    IFS='|' read -r n t d desc <<< "$p"
    printf '| `%s` | `%s` | `%s` | %s |\n' "$n" "$t" "$d" "$desc"
  done
  printf '\n| State | Background | Border | Text | Notes |\n|---|---|---|---|---|\n'
  local s
  for s in "${states[@]}"; do
    case "$s" in
      default) printf '| default | `%s` | `%s` | `%s` | Resting appearance |\n' "$bg" "$border" "$text" ;;
      hover) printf '| hover | `--surface-hover` over `%s` | `--border-strong` | `%s` | Transition `--duration-fast` `--ease-standard` |\n' "$bg" "$text" ;;
      focus-visible) printf '| focus-visible | `%s` | `--border-focus` ring 2px, offset 2px | `%s` | Keyboard focus only; never remove the ring |\n' "$bg" "$text" ;;
      active) printf '| active | `--surface-selected` | `--border-strong` | `%s` | Pressed or selected |\n' "$text" ;;
      disabled) printf '| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `aria-disabled` when it must stay focusable |\n' ;;
      invalid) printf '| invalid | `--danger-subtle` | `--danger-text` | `%s` | Pair with a message; color is never the only cue |\n' "$text" ;;
    esac
  done
  printf '\n'
}

{
  cat <<'MD'
# 02 Components

The shared components every page builds from. Each section lists the props the
component accepts, the token each state resolves to, and the rules reviewers
apply. A page that needs a variant not listed here proposes it in this file
first; one-off variants in page CSS are not accepted.

All components inherit the focus treatment from 01 Foundations: a 2px
`--border-focus` ring at a 2px offset on `:focus-visible`, never on mouse
focus, and never removed.

MD
  component_section "Button" \
    "Triggers an action. One primary button per view; everything else is secondary or quiet." \
    "container, optional leading icon, label, optional trailing icon" \
    "--accent-fill" "--accent-fill" "--text-inverse" \
    "variant|'primary' \| 'secondary' \| 'quiet' \| 'danger'|'secondary'|Visual weight; danger only for destructive actions" \
    "size|'sm' \| 'md' \| 'lg'|'md'|Height 28, 36, or 44px" \
    "type|'button' \| 'submit' \| 'reset'|'button'|Native button type; forms submit with exactly one submit button" \
    "disabled|boolean|false|Prefer explaining why over disabling" \
    "loading|boolean|false|Replaces the leading icon with a spinner and keeps the width" \
    "icon|IconName|none|Leading icon; icon-only buttons use IconButton"
  component_section "IconButton" \
    "An icon-only action for dense toolbars and row actions." \
    "container, icon, required accessible label" \
    "--surface-panel" "--border-default" "--text-secondary" \
    "icon|IconName|required|The glyph" \
    "label|string|required|Accessible name; also shown as the tooltip" \
    "size|'sm' \| 'md'|'md'|28 or 36px square" \
    "pressed|boolean \| undefined|undefined|Set for toggle buttons; renders aria-pressed"
  component_section "TextInput" \
    "Single-line text entry. Always paired with a visible label." \
    "label, optional hint, input, optional prefix or suffix, message slot" \
    "--surface-panel" "--border-default" "--text-primary" \
    "label|string|required|Visible label above the input" \
    "hint|string|none|Helper text below the label, above the input" \
    "type|'text' \| 'email' \| 'url' \| 'number' \| 'password' \| 'search'|'text'|Native input type" \
    "width|'xs' \| 'sm' \| 'md' \| 'lg' \| 'full'|'md'|Sized to the expected value, not the container" \
    "required|boolean|false|Marks the label with (required); never an asterisk alone" \
    "invalid|boolean|false|Shows the invalid state; pass a message" \
    "message|string|none|Validation message, announced politely"
  component_section "Textarea" \
    "Multi-line text entry for free-form content." \
    "label, optional hint, textarea, character counter, message slot" \
    "--surface-panel" "--border-default" "--text-primary" \
    "label|string|required|Visible label" \
    "rows|number|4|Initial visible rows" \
    "maxLength|number|none|Shows a counter when set" \
    "resize|'vertical' \| 'none'|'vertical'|Horizontal resize is never allowed"
  component_section "Select" \
    "Choosing one option from a known list of more than five." \
    "label, trigger showing the current value, chevron, option list" \
    "--surface-panel" "--border-default" "--text-primary" \
    "label|string|required|Visible label" \
    "options|Option[]|required|Value and label pairs; groups allowed" \
    "placeholder|string|'Select…'|Shown when no value is set" \
    "searchable|boolean|false|Adds type-ahead filtering for lists over 15 options"
  component_section "Checkbox" \
    "An independent on or off choice, or one item in a multi-select list." \
    "box, check glyph, label, optional description" \
    "--surface-panel" "--border-strong" "--text-primary" \
    "label|string|required|Clickable label to the right of the box" \
    "description|string|none|Secondary line under the label" \
    "checked|boolean \| 'mixed'|false|Mixed only for parent checkboxes" \
    "disabled|boolean|false|Keep the label readable"
  component_section "Switch" \
    "An on or off setting that takes effect immediately, with no Save step." \
    "track, thumb, label, optional state text" \
    "--surface-sunken" "--border-default" "--text-primary" \
    "label|string|required|Names the setting, not the state" \
    "checked|boolean|false|Current state" \
    "stateText|boolean|false|Shows On or Off beside the track"
  component_section "RadioGroup" \
    "Choosing exactly one option from two to five visible choices." \
    "group label, radio items each with a dot and a label, optional descriptions" \
    "--surface-panel" "--border-strong" "--text-primary" \
    "label|string|required|Rendered as the fieldset legend" \
    "options|Option[]|required|Two to five items" \
    "orientation|'vertical' \| 'horizontal'|'vertical'|Horizontal only for two or three short labels"
  component_section "Card" \
    "A bounded container that holds one object or one cluster of content." \
    "container, optional header with title and actions, body, optional footer" \
    "--surface-panel" "--border-subtle" "--text-primary" \
    "title|string|none|Rendered as a heading at the level the page passes" \
    "headingLevel|2 \| 3 \| 4|3|Keeps the document outline intact" \
    "actions|Action[]|none|Up to two quiet buttons in the header" \
    "padding|'sm' \| 'md' \| 'lg'|'md'|Maps to --space-5, --space-6, --space-8"
  component_section "Tabs" \
    "Switching between peer views of the same object without leaving the page." \
    "tab list, tabs with labels and optional counts, active indicator, panels" \
    "--surface-panel" "--border-subtle" "--text-secondary" \
    "tabs|Tab[]|required|Two to seven tabs" \
    "selected|string|first tab|Controlled selection" \
    "activation|'automatic' \| 'manual'|'manual'|Manual means arrow keys move focus and Enter selects"
  component_section "Accordion" \
    "Progressive disclosure for secondary content a user may never need." \
    "header buttons with chevrons, panels" \
    "--surface-panel" "--border-subtle" "--text-primary" \
    "items|AccordionItem[]|required|Header and panel pairs" \
    "multiple|boolean|true|Whether several panels may be open at once" \
    "defaultOpen|string[]|[]|Item ids open on first render"
  component_section "Banner" \
    "A page-level message about the state of the page or the account." \
    "icon, title, body, optional action, optional dismiss" \
    "--info-subtle" "--border-subtle" "--info-text" \
    "tone|'info' \| 'success' \| 'warning' \| 'danger'|'info'|Sets the icon and the state tokens" \
    "dismissible|boolean|false|Dismissal is remembered per user" \
    "action|Action|none|One quiet button"
  component_section "Toast" \
    "A short confirmation that an action finished. Never the only record of an error." \
    "message, optional action, dismiss" \
    "--surface-inverse" "--surface-inverse" "--text-inverse" \
    "message|string|required|Under 80 characters" \
    "action|Action|none|Undo is the usual action" \
    "duration|number|5000|Milliseconds; paused on hover and focus"
  component_section "Dialog" \
    "A blocking question or a short focused task." \
    "scrim, container, title, body, footer with actions" \
    "--surface-raised" "--surface-raised" "--text-primary" \
    "title|string|required|Becomes the accessible name" \
    "size|'sm' \| 'md' \| 'lg'|'md'|Max widths 400, 560, 720px" \
    "dismissible|boolean|true|Escape and scrim click close it unless false" \
    "initialFocus|string|first field|Element id to focus on open"
  component_section "Badge" \
    "A short status or count attached to another element." \
    "container, label" \
    "--surface-sunken" "--border-subtle" "--text-secondary" \
    "tone|'neutral' \| 'info' \| 'success' \| 'warning' \| 'danger'|'neutral'|Uses the matching -subtle and -text tokens" \
    "label|string|required|One or two words, or a number"
  component_section "Tag" \
    "A removable label the user applied, such as a filter or a category." \
    "container, label, optional remove button" \
    "--surface-sunken" "--border-subtle" "--text-primary" \
    "label|string|required|The tag text" \
    "removable|boolean|false|Shows a remove IconButton labeled 'Remove {label}'" \
    "tone|'neutral' \| 'accent'|'neutral'|Accent only for the active filter"
  component_section "Avatar" \
    "A person's or workspace's picture, with initials as the fallback." \
    "circle, image or initials, optional status dot" \
    "--surface-sunken" "--border-subtle" "--text-secondary" \
    "src|string|none|Image URL; falls back to initials on error" \
    "name|string|required|Used for the initials and the alt text" \
    "size|'xs' \| 'sm' \| 'md' \| 'lg'|'md'|20, 28, 36, or 56px" \
    "status|'online' \| 'away' \| 'none'|'none'|Status dot with a text alternative"
  component_section "Tooltip" \
    "A short label for an icon or a truncated value. Never holds information that is needed to complete a task." \
    "bubble, arrow, text" \
    "--surface-inverse" "--surface-inverse" "--text-inverse" \
    "content|string|required|Under 60 characters, no links" \
    "placement|'top' \| 'bottom' \| 'start' \| 'end'|'top'|Flips when there is no room" \
    "delay|number|400|Milliseconds before showing on hover; focus shows it at once"
  component_section "Menu" \
    "A list of actions that opens from a button." \
    "trigger button, popover, menu items, optional group labels and separators" \
    "--surface-raised" "--border-subtle" "--text-primary" \
    "items|MenuItem[]|required|Label, optional icon, optional shortcut, optional danger tone" \
    "placement|'bottom-start' \| 'bottom-end'|'bottom-start'|Flips when there is no room" \
    "closeOnSelect|boolean|true|Keep open only for checkbox menu items"
  component_section "Popover" \
    "Non-modal floating content anchored to a trigger, such as a filter panel." \
    "trigger, container, optional title, body, optional footer" \
    "--surface-raised" "--border-subtle" "--text-primary" \
    "title|string|none|Becomes the accessible name when set" \
    "placement|'top' \| 'bottom' \| 'start' \| 'end'|'bottom'|Flips when there is no room" \
    "width|'sm' \| 'md' \| 'lg'|'md'|280, 360, or 480px"
  component_section "Breadcrumb" \
    "Shows where the current page sits in the hierarchy and links to its ancestors." \
    "ordered list of links, separators, current page item" \
    "--surface-page" "--surface-page" "--text-secondary" \
    "items|Crumb[]|required|Label and href; the last item is the current page" \
    "maxItems|number|4|Collapses the middle into a menu beyond this"
  component_section "Pagination" \
    "Moves between pages of a long list or table." \
    "previous button, page buttons, ellipsis, next button, optional page-size select" \
    "--surface-panel" "--border-default" "--text-primary" \
    "page|number|1|Current page, one-based" \
    "pageCount|number|required|Total pages" \
    "pageSize|number|25|Rows per page" \
    "pageSizeOptions|number[]|[25, 50, 100]|Shown in the page-size select"
  component_section "Table" \
    "Rows of comparable records with sortable columns." \
    "caption, header row, body rows, optional selection column, optional row actions" \
    "--surface-panel" "--border-subtle" "--text-primary" \
    "columns|Column[]|required|Key, header, alignment, sortable" \
    "rows|Row[]|required|Records keyed by id" \
    "selectable|boolean|false|Adds a checkbox column and a bulk-action bar" \
    "density|'comfortable' \| 'compact'|'comfortable'|Row height 48 or 36px" \
    "stickyHeader|boolean|true|Header stays visible while the body scrolls"
  component_section "EmptyState" \
    "What a list or page shows when there is nothing in it yet." \
    "illustration, title, body, primary action" \
    "--surface-panel" "--surface-panel" "--text-secondary" \
    "title|string|required|Says what will appear here" \
    "body|string|none|One sentence on how to get started" \
    "action|Action|none|One primary button"
  component_section "Skeleton" \
    "A placeholder shape shown while content loads." \
    "one or more blocks matching the shape of the content" \
    "--surface-sunken" "--surface-sunken" "--text-disabled" \
    "shape|'text' \| 'block' \| 'circle'|'text'|Matches the content it stands in for" \
    "lines|number|1|For text shapes" \
    "animate|boolean|true|Shimmer is off under reduced motion"
  component_section "ProgressBar" \
    "Shows progress of a task with a known length." \
    "track, fill, optional label, optional value text" \
    "--surface-sunken" "--surface-sunken" "--text-secondary" \
    "value|number|required|0 to max" \
    "max|number|100|The value at completion" \
    "label|string|required|Accessible name; shown above the track" \
    "showValue|boolean|true|Shows the percentage beside the label"
  component_section "Spinner" \
    "Shows that something is working when the length is unknown." \
    "rotating ring, visually hidden label" \
    "--surface-panel" "--surface-panel" "--text-secondary" \
    "size|'sm' \| 'md' \| 'lg'|'md'|16, 24, or 40px" \
    "label|string|'Loading'|Announced once, politely"
  component_section "Stepper" \
    "Shows position in a short, linear, multi-step flow." \
    "ordered steps with numbers, labels, and connectors" \
    "--surface-panel" "--border-default" "--text-secondary" \
    "steps|Step[]|required|Three to six steps" \
    "current|number|0|Zero-based index of the current step" \
    "clickable|boolean|false|Lets users go back to completed steps"
  component_section "DatePicker" \
    "Entering a single date, typed or chosen from a calendar." \
    "label, text input, calendar button, calendar popover" \
    "--surface-panel" "--border-default" "--text-primary" \
    "label|string|required|Visible label" \
    "value|string|none|ISO 8601 date" \
    "min|string|none|Earliest selectable date" \
    "max|string|none|Latest selectable date"
  component_section "FileUpload" \
    "Choosing one or more files from the device, by browsing or dropping." \
    "label, drop zone, browse button, file list with remove buttons" \
    "--surface-sunken" "--border-default" "--text-secondary" \
    "label|string|required|Visible label" \
    "accept|string|none|File types, as in the native accept attribute" \
    "maxSize|number|none|Bytes; larger files are rejected with a message" \
    "multiple|boolean|false|Allows several files"
  component_section "Combobox" \
    "Choosing from a long list by typing to filter, optionally adding new values." \
    "label, text input, listbox popup, optional chips for multiple values" \
    "--surface-panel" "--border-default" "--text-primary" \
    "label|string|required|Visible label" \
    "options|Option[]|required|Value and label pairs" \
    "multiple|boolean|false|Selected values render as Tags" \
    "creatable|boolean|false|Offers 'Add {query}' when nothing matches"
} > "$G/02-components.md"

# --- 03-forms.md ------------------------------------------------------------

{
  cat <<'MD'
# 03 Forms

How fields, labels, help, validation, and saving behave on every form in the
app. These rules apply field by field and to the save behavior of a form as a
whole.

## Labels and help

- Every field has a visible label. Placeholder text is never a label and never
  holds information the user needs after they start typing.
- Labels sit above their control, left-aligned, in `--type-label`. The gap from
  label to control is `--space-4`.
- Checkbox and switch labels sit to the right of the control, and the whole
  label is clickable.
- Hint text sits between the label and the control in `--type-body-sm` and
  `--text-secondary`, and the control references it with
  `aria-describedby`.
- Mark required fields with "(required)" after the label when most fields are
  optional, or mark optional fields with "(optional)" when most are required.
  Never rely on an asterisk alone.
- Keep labels to a noun phrase: "Display name", not "Enter your display name".

## Field sizing

Size the control to the value it will hold, not to the container. A five-digit
number in a full-width input reads as a bug.

| Field type | Control | Width token | Validation | Keyboard and input mode | Notes |
|---|---|---|---|---|---|
MD
  while IFS='|' read -r ft ctl w val kb note; do
    printf '| %s | %s | `%s` | %s | %s | %s |\n' "$ft" "$ctl" "$w" "$val" "$kb" "$note"
  done <<'ROWS'
Person name|TextInput|md|1 to 80 characters|autocomplete=name|Do not split into first and last unless a downstream system requires it
Display name|TextInput|md|1 to 50 characters, trimmed|autocomplete=nickname|Shown to other users
Email address|TextInput type=email|lg|Syntax check on blur, existence check on save|inputmode=email, autocomplete=email|Changing it sends a confirmation email
Phone number|TextInput type=tel|sm|E.164 after normalization|inputmode=tel, autocomplete=tel|Show the normalized form after blur
URL|TextInput type=url|lg|Absolute http or https|inputmode=url|Prefix https:// when the user omits a scheme
Password|TextInput type=password|md|Policy from the auth service|autocomplete=new-password|Show and hide toggle as an IconButton
One-time code|TextInput|xs|6 digits|inputmode=numeric, autocomplete=one-time-code|Paste fills every box
Search|TextInput type=search|lg|none|enterkeyhint=search|Clear button inside the field
Integer quantity|TextInput type=number|xs|Min and max from the API|inputmode=numeric|No spinner arrows
Duration in minutes|TextInput type=number|xs|1 to 1440|inputmode=numeric|Suffix "min" inside the field
Currency amount|TextInput|sm|Two decimals, locale aware|inputmode=decimal|Currency symbol as a prefix
Percentage|TextInput|xs|0 to 100|inputmode=decimal|Suffix "%"
Date|Date picker|sm|Valid calendar date|Typed entry allowed|Format from 04 Content
Date range|Two date pickers|sm each|Start before end|Typed entry allowed|Presets in a Select beside it
Time|TextInput|xs|24-hour or 12-hour per locale|inputmode=numeric|Never a Select of every minute
Time zone|Select searchable|lg|IANA zone id|Type-ahead|Default to the browser zone; show the UTC offset in each option
Language|Select|md|Supported locale list|Type-ahead|Each option in its own language
Country|Select searchable|md|ISO 3166 list|Type-ahead|Put the detected country first
Theme or appearance|RadioGroup|n/a|One of the listed values|Arrow keys|Options: Light, Dark, Match system
Single on or off setting saved with the form|Checkbox|n/a|none|Space toggles|Use Switch only when the change applies immediately
Single on or off setting applied immediately|Switch|n/a|none|Space toggles|Never inside a form that has a Save button
Several independent options|Checkbox list|n/a|Optional minimum|Space toggles|Fieldset with a legend
One of two to five options|RadioGroup|n/a|Required unless a default is safe|Arrow keys|Show every option
One of six or more options|Select|md|Required unless a default is safe|Type-ahead|Group long lists
Long free text|Textarea|full|Max length from the API|none|Counter when a max exists
Secret value, shown once|Read-only field with copy button|lg|none|Copy with one click|Mask after the first view
Secret value, regenerable|Read-only field plus Button|lg|Confirm before regenerating|none|Regenerating revokes the old value
Avatar or image|File input with preview|n/a|Type and size from the API|none|Show the current image beside the control
Color|Swatch picker|n/a|One of the palette tokens|Arrow keys|Never free-form hex
Tags|Combobox with chips|lg|Max count from the API|Enter adds, Backspace removes|Suggest existing tags first
ROWS
  cat <<'MD'

## Validation

- Validate on blur for format, on save for anything that needs the server.
  Never validate on every keystroke; the exception is a counter that shows the
  remaining characters.
- An invalid field shows the invalid state from 02 Components and a message
  directly below the control, in `--danger-text`, starting with the field
  name.
- On a failed save, move focus to the first invalid field and show a Banner
  with tone `danger` at the top of the form listing every invalid field as a
  link to that field.
- Keep what the user typed. Never clear a field because it failed validation.

### Message catalog

Use these messages verbatim; reviewers diff against this table. `{field}` is
the field's label in sentence case.

| Code | Message | When |
|---|---|---|
MD
  while IFS='|' read -r code msg when; do
    printf '| `%s` | %s | %s |\n' "$code" "$msg" "$when"
  done <<'ROWS'
required|{field} is required.|Empty required field on save
too_short|{field} must be at least {min} characters.|Below minimum length
too_long|{field} must be {max} characters or fewer.|Above maximum length
email_format|{field} must be an email address, like name@example.com.|Email syntax check fails
email_taken|That email address is already in use.|Server rejects the email
url_format|{field} must be a full web address, starting with https://.|URL syntax check fails
url_unreachable|We could not reach that address. Check it and try again.|Server cannot fetch the URL
number_format|{field} must be a number.|Non-numeric entry
number_min|{field} must be {min} or more.|Below the minimum value
number_max|{field} must be {max} or less.|Above the maximum value
integer_only|{field} must be a whole number.|Decimal in an integer field
date_format|{field} must be a date, like {example}.|Unparseable date
date_past|{field} must be today or later.|Date in the past where not allowed
date_order|The end date must be after the start date.|Range out of order
time_format|{field} must be a time, like {example}.|Unparseable time
zone_unknown|Choose a time zone from the list.|Free text in a zone field
choice_required|Choose an option for {field}.|No radio selected
file_type|{field} must be a {types} file.|Wrong file type
file_size|{field} must be smaller than {size}.|File too large
password_policy|Your password needs {rules}.|Fails the auth policy
password_mismatch|The passwords do not match.|Confirmation differs
code_invalid|That code is not valid. Check it and try again.|Wrong one-time code
code_expired|That code has expired. Request a new one.|Expired one-time code
save_conflict|Someone else changed these settings. Reload to see their changes.|Version conflict on save
save_failed|We could not save your changes. Try again.|Unexpected server error
offline|You are offline. Your changes will be saved when you reconnect.|No network on save
session_expired|Your session has expired. Sign in again to save.|Auth expired on save
rate_limited|Too many attempts. Try again in {minutes} minutes.|Server rate limit
permission_denied|You do not have permission to change {field}.|Authorization failure
ROWS
  cat <<'MD'

## Saving

- A form with a Save button saves every field at once. Show the button in its
  `loading` state while saving and keep it in place; do not move or resize it.
- Disable nothing while saving. If the user edits a field mid-save, the next
  save sends the new value.
- On success, show a Toast ("Settings saved") and keep the user where they
  were. Do not navigate away and do not scroll.
- When the form has unsaved changes and the user tries to leave, confirm with
  a Dialog: title "Discard unsaved changes?", actions "Keep editing" (primary)
  and "Discard" (quiet).
- Settings that take effect immediately use a Switch and never sit inside a
  form with a Save button. Mixing the two on one page is allowed only when the
  immediate settings are clearly separated from the saved ones.
- Secrets (API tokens, recovery codes) are never sent back to the server on
  save. They are read-only, shown masked after the first view, and changed only
  through their own regenerate action with a confirming Dialog.

## Keyboard behavior

| Key | In a text field | On a checkbox or switch | In a select | On the form |
|---|---|---|---|---|
| Tab | Next field | Next field | Next field | Moves through fields in reading order |
| Shift+Tab | Previous field | Previous field | Previous field | Reverse order |
| Enter | Submits the form | No effect | Opens or selects | Submits from any text field |
| Space | Types a space | Toggles | Opens | No effect |
| Escape | Clears a search field | No effect | Closes the list | Closes an open Dialog |
| Arrow keys | Moves the caret | No effect | Moves through options | Moves within a RadioGroup |
| Home / End | Line start or end | No effect | First or last option | No effect |

## Field state reference

What each control looks like and announces in each state. Values are the
semantic tokens from 01 Foundations; reviewers compare rendered states against
these tables.
MD
  controls=("TextInput|text box|--border-default|edit text"
    "Textarea|multi-line text box|--border-default|edit text, multi-line"
    "Select|collapsed list showing the current value|--border-default|pop-up button"
    "Checkbox|box with a check glyph|--border-strong|checkbox"
    "Switch|track and thumb|--border-default|switch"
    "RadioGroup|dot in a ring, one per option|--border-strong|radio button"
    "Date picker|text box with a calendar button|--border-default|edit text, date"
    "File input|drop zone with a browse button|--border-default|button, file upload"
    "Combobox with chips|text box followed by a chip list|--border-default|combo box"
    "Swatch picker|row of palette swatches|--border-subtle|radio group, color"
    "Read-only field|sunken value with a copy button|--border-subtle|read-only text")
  for c in "${controls[@]}"; do
    IFS='|' read -r cname shape cborder role <<< "$c"
    printf '\n### %s\n\nRenders as a %s. Screen readers announce it as "%s".\n\n' "$cname" "$shape" "$role"
    printf '| State | Background | Border | Text | Icon | Announcement |\n|---|---|---|---|---|---|\n'
    printf '| empty | `--surface-panel` | `%s` | `--text-tertiary` placeholder | `--text-tertiary` | "{label}, %s, empty" |\n' "$cborder" "$role"
    printf '| filled | `--surface-panel` | `%s` | `--text-primary` | `--text-secondary` | "{label}, %s, {value}" |\n' "$cborder" "$role"
    printf '| hover | `--surface-panel` | `--border-strong` | `--text-primary` | `--text-secondary` | none; hover is not announced |\n'
    printf '| focused | `--surface-panel` | `--border-focus`, 2px ring at 2px offset | `--text-primary` | `--text-primary` | "{label}, %s, {value or empty}, {hint}" |\n' "$role"
    printf '| invalid | `--danger-subtle` | `--danger-text` | `--text-primary`, message in `--danger-text` | `--danger-text` alert glyph | "{label}, %s, invalid entry, {message}" |\n' "$role"
    printf '| disabled | `--surface-sunken` | `--border-subtle` | `--text-disabled` | `--text-disabled` | "{label}, %s, dimmed" |\n' "$role"
    printf '| read-only | `--surface-sunken` | `--border-subtle` | `--text-secondary` | `--text-tertiary` lock glyph | "{label}, %s, read-only, {value}" |\n' "$role"
  done
  cat <<'MD'

## Autocomplete tokens

Personal-data fields carry the matching `autocomplete` token so browsers and
password managers can fill them (accessibility checklist row 1.3.5).

| Field | Token | Notes |
|---|---|---|
MD
  while IFS='|' read -r field tok note; do
    printf '| %s | `%s` | %s |\n' "$field" "$tok" "$note"
  done <<'ROWS'
Full name|name|One field; do not split unless required
Given name|given-name|Only when a downstream system requires the split
Family name|family-name|Only when a downstream system requires the split
Display name|nickname|Shown to other members
Email address|email|Also on sign-in forms
Username for sign-in|username|Email doubles as the username here
Current password|current-password|Sign-in and change-password forms
New password|new-password|Sign-up and change-password forms
One-time code|one-time-code|Paste fills every box
Phone number|tel|Store E.164
Phone country code|tel-country-code|Only when collected separately
Organization|organization|Workspace name on invoices
Job title|organization-title|Optional profile field
Street address line 1|address-line1|Billing address
Street address line 2|address-line2|Billing address
City|address-level2|Billing address
State or region|address-level1|Billing address
Postal code|postal-code|Billing address
Country|country|ISO 3166 code as the value
Country name|country-name|Display label only
Language|language|BCP 47 tag as the value
Birthday|bday|Never required
Profile photo URL|photo|Avatar URL field
Website|url|Profile field
Time zone|off|No standard token; disable autofill
Session timeout|off|Not personal data
API token|off|Never autofill secrets
Search|off|Autofill would leak history
ROWS
} > "$G/03-forms.md"

# --- 04-content-and-accessibility.md ---------------------------------------

{
  cat <<'MD'
# 04 Content and accessibility

How the interface talks, and the accessibility bar every page clears before it
ships.

## Voice

Plain, direct, and calm. Write the way a helpful colleague would say it out
loud. Lead with what the user can do, not with what went wrong. Prefer short
sentences and common words; cut any word that does not change the meaning.

- Address the user as "you". Refer to the product as "we" only in messages
  where we did something ("We sent a code to your email").
- Never blame the user. "That code has expired" rather than "You entered an
  expired code".
- No exclamation marks outside of genuinely celebratory moments, and there are
  very few of those in a settings page.
- No jargon the user did not introduce. "Sign in", not "authenticate".

## Capitalization and punctuation

- Sentence case everywhere: page titles, headings, labels, buttons, menu items,
  tab names, and table headers. Proper nouns keep their capitals.
- Buttons are verbs or verb phrases: "Save", "Regenerate token", "Discard".
  Never "OK" or "Yes" in a Dialog; repeat the action.
- No period at the end of a label, button, heading, or single-sentence hint.
  Use periods in messages and multi-sentence help.
- Use the serial comma. Use an en dash for ranges ("9–5") and an em dash with
  no spaces for breaks in a sentence, sparingly.

## Terminology

Use the preferred term; reviewers flag the avoided forms.

| Preferred | Avoid | Notes |
|---|---|---|
MD
  while IFS='|' read -r pref avoid note; do
    printf '| %s | %s | %s |\n' "$pref" "$avoid" "$note"
  done <<'ROWS'
sign in|log in, login (as a verb), authenticate|"Sign-in" as a noun or adjective
sign out|log out, logout|"Sign-out" as a noun
sign up|register, create login|Only on the public site
account|profile (for account-level settings)|Profile means the public-facing identity
profile|account (for public-facing identity)|Display name and avatar live here
settings|preferences, options, configuration|One word for every settings surface
display name|username, handle, nickname|There are no usernames in this product
email address|e-mail, mail, email ID|"Email" alone is fine in a label
time zone|timezone, TZ|Two words
language|locale|Locale is an implementation term
theme|appearance mode, skin|Light, Dark, Match system
notifications|alerts, messages|Alerts are a different, admin-only feature
email notifications|email alerts|Matches the field label
push notifications|mobile alerts, device notifications|Only for the mobile app and browser push
weekly digest|weekly summary, newsletter|Not a marketing email
two-factor authentication|2FA, MFA, two-step verification|"Two-factor auth" in tight labels
recovery codes|backup codes|Shown once at setup
session timeout|idle timeout, auto logout|Minutes of inactivity before sign-out
API token|API key, access token, secret|Shown once, then masked
regenerate|reset, rotate, refresh|For tokens and codes
delete|remove, erase|Delete is permanent; remove is for detaching
remove|delete (when nothing is destroyed)|Removing a member keeps their account
save|apply, submit, update|For forms with a Save button
cancel|abort, back|Leaves without saving
discard|throw away, lose|Only for unsaved changes
dialog|modal, popup|In documentation; never shown to users
banner|alert bar, notice|In documentation
toast|snackbar, notification|In documentation
required|mandatory, compulsory|"(required)" after a label
optional|not required|"(optional)" after a label
invalid|wrong, bad, incorrect|In documentation; messages describe the fix
expired|timed out|For codes and sessions
offline|disconnected, no connection|In messages
workspace|organization, team, tenant|The billing and membership unit
member|user (inside a workspace)|User is fine in documentation
owner|admin (for the billing owner)|Admins are a separate role
admin|administrator, superuser|Short form everywhere
ROWS
  cat <<'MD'

## Formats

| Value | Format | Example (en-US) | Notes |
|---|---|---|---|
| Date | Locale medium date | Sep 14, 2026 | Never numeric-only in the interface |
| Date and time | Locale medium date, short time | Sep 14, 2026, 3:05 PM | Show the time zone when it differs from the user's |
| Relative time | Rounded, past only | 5 minutes ago | Switch to an absolute date after 7 days |
| Duration | Largest two units | 1 hr 20 min | Never "80 minutes" |
| Number | Locale grouping | 12,480 | Tabular figures in tables |
| Percentage | Up to one decimal | 12.5% | No space before % in en-US |
| Currency | Locale currency format | $1,250.00 | Always two decimals |
| File size | Binary units, one decimal | 2.4 MB | Use MB, not MiB, in the interface |
| Time zone | Zone name with UTC offset | Pacific Time (UTC−07:00) | Use the minus sign, not a hyphen |
| Phone | National format when local, else E.164 | (555) 010-4477 | Store E.164 |

## Accessibility checklist

Every page clears every row before it ships. "How to check" is what reviewers
actually do.

| Criterion | Level | Requirement | How to check |
|---|---|---|---|
MD
  while IFS='|' read -r crit lvl req how; do
    printf '| %s | %s | %s | %s |\n' "$crit" "$lvl" "$req" "$how"
  done <<'ROWS'
1.1.1 Non-text content|A|Every meaningful image and icon has a text alternative; decorative ones are hidden|Inspect alt and aria-hidden on every img and svg
1.3.1 Info and relationships|A|Headings, lists, tables, labels, and fieldsets are real elements, not styled divs|Read the page with styles disabled
1.3.2 Meaningful sequence|A|DOM order matches visual order|Tab through the page and watch the focus order
1.3.3 Sensory characteristics|A|Instructions do not rely on shape, position, or color alone|Read every instruction out of context
1.3.4 Orientation|AA|Works in portrait and landscape|Rotate a tablet emulator
1.3.5 Identify input purpose|AA|Personal-data fields carry autocomplete tokens|Check against the field table in 03 Forms
1.4.1 Use of color|A|Color is never the only way to convey state|View in grayscale
1.4.3 Contrast (minimum)|AA|4.5:1 for body text, 3:1 for large text|Use only the approved pairs in 01 Foundations
1.4.4 Resize text|AA|Usable at 200% browser zoom without loss|Zoom to 200% and complete the main task
1.4.5 Images of text|AA|No text rendered as images|Search the page for text in img
1.4.10 Reflow|AA|No horizontal scrolling at 320 CSS px wide|Set the viewport to 320px
1.4.11 Non-text contrast|AA|3:1 for control borders and focus indicators|Check input borders and the focus ring
1.4.12 Text spacing|AA|No clipping with increased letter, word, and line spacing|Apply the text-spacing bookmarklet
1.4.13 Content on hover or focus|AA|Tooltips are dismissible, hoverable, and persistent|Hover, then move into the tooltip, then press Escape
2.1.1 Keyboard|A|Every action is reachable and operable by keyboard|Unplug the mouse
2.1.2 No keyboard trap|A|Focus can always leave a component|Tab into and out of every widget
2.4.1 Bypass blocks|A|A skip link reaches the main content|Press Tab once on load
2.4.2 Page titled|A|The document title names the page and the product|Check the browser tab
2.4.3 Focus order|A|Focus moves in a logical order|Tab through and note every jump
2.4.4 Link purpose|A|Link text makes sense out of context|List every link and read it alone
2.4.6 Headings and labels|AA|Headings and labels describe their content|Read the heading outline alone
2.4.7 Focus visible|AA|The focus ring is always visible|Tab through on every surface color
2.4.11 Focus not obscured|AA|Sticky headers and footers never hide the focused element|Tab to fields near the sticky footer
2.5.3 Label in name|A|The accessible name contains the visible label|Compare labels with the accessibility tree
2.5.7 Dragging movements|AA|Anything draggable has a non-drag alternative|Try every drag interaction by keyboard
2.5.8 Target size|AA|Targets are at least 24 by 24 CSS px|Measure IconButtons and checkboxes
3.1.1 Language of page|A|The html element has a lang attribute|Inspect the root element
3.2.1 On focus|A|Focus never triggers a change of context|Tab through every field
3.2.2 On input|A|Changing a field never navigates or submits on its own|Change every select and radio
3.3.1 Error identification|A|Errors are identified in text|Submit the form empty
3.3.2 Labels or instructions|A|Every field has a label and needed instructions|Read the field table in 03 Forms
3.3.3 Error suggestion|AA|Error messages say how to fix the problem|Compare against the message catalog
3.3.4 Error prevention|AA|Destructive and financial actions are confirmable|Trigger every delete and regenerate
3.3.7 Redundant entry|A|Previously entered information is not requested again|Walk the longest flow twice
3.3.8 Accessible authentication|AA|No cognitive test to sign in; paste is allowed|Paste into every password and code field
4.1.2 Name, role, value|A|Custom widgets expose correct roles and states|Inspect switches, tabs, and accordions
4.1.3 Status messages|AA|Toasts and inline status are announced without moving focus|Listen with a screen reader on save
ROWS
  cat <<'MD'

## Component accessibility reference

What every shared component from 02 Components must expose, and how reviewers
check it. A component that fails a row here fails review regardless of how it
looks.
MD
  a11y=("Button|button|its label text|Enter and Space activate|aria-busy while loading|24 by 24 px; 36 px tall at md"
    "IconButton|button|the required label prop|Enter and Space activate|aria-pressed when it toggles|28 px square minimum"
    "TextInput|textbox|the visible label via for and id|Typing edits; Enter submits the form|aria-invalid and aria-describedby for the message|Full control height, 36 px"
    "Textarea|textbox with aria-multiline|the visible label via for and id|Enter inserts a line break|aria-invalid; the counter is aria-live polite|Full control height"
    "Select|combobox with a listbox popup|the visible label|Space or Enter opens; arrows move; Escape closes|aria-expanded and aria-activedescendant|36 px tall trigger"
    "Checkbox|checkbox|the label to its right|Space toggles|aria-checked, including mixed|24 by 24 px including the label hit area"
    "Switch|switch|the setting name, never the state|Space toggles|aria-checked|44 by 24 px track"
    "RadioGroup|radiogroup containing radio items|the fieldset legend|Arrows move and select; Tab leaves the group|aria-checked on each item|24 by 24 px per item including the label"
    "Card|region when it has a title, otherwise none|its heading via aria-labelledby|Not focusable itself|none|Not applicable"
    "Tabs|tablist, tab, and tabpanel|each tab's label|Arrows move; Enter selects in manual mode|aria-selected and aria-controls|36 px tall tabs"
    "Accordion|button headers controlling regions|the header text|Enter and Space toggle|aria-expanded and aria-controls|Full header width, 40 px tall"
    "Banner|status for info and success, alert for warning and danger|its title|Not focusable unless it has an action|Announced on appearance|Dismiss button 28 px square"
    "Toast|status in a live region|its message|Focus does not move to it; F6 reaches the region|Announced politely|Action and dismiss 28 px square"
    "Dialog|dialog with aria-modal|its title via aria-labelledby|Escape closes when dismissible; Tab is trapped inside|Focus returns to the trigger on close|Close button 28 px square"
    "Badge|none; text in context|the text it contains|Not focusable|Counts include a visually hidden noun|Not applicable")
  for row in "${a11y[@]}"; do
    IFS='|' read -r comp role name keys state target <<< "$row"
    printf '\n### %s\n\n| Criterion | Requirement | How to check |\n|---|---|---|\n' "$comp"
    printf '| Role | Exposes %s | Inspect the accessibility tree in browser dev tools |\n' "$role"
    printf '| Accessible name | Named by %s | Compare the computed name with the visible text |\n' "$name"
    printf '| Keyboard | %s | Operate it with the keyboard alone, mouse unplugged |\n' "$keys"
    printf '| Focus | Visible ring from 01 Foundations on :focus-visible; never removed | Tab to it on every surface color |\n'
    printf '| State | %s | Change its state and listen with VoiceOver and NVDA |\n' "$state"
    printf '| Target size | %s | Measure the hit area in dev tools |\n' "$target"
  done
  cat <<'MD'

## Locale formats

The supported locales and how the formats above render in each. The
formatting library produces these; the table is here so reviewers can spot a
hand-formatted value.

| Locale | Date | Date and time | Number | Currency | First day of week |
|---|---|---|---|---|---|
| en-US | Sep 14, 2026 | Sep 14, 2026, 3:05 PM | 12,480.5 | $1,250.00 | Sunday |
| en-GB | 14 Sept 2026 | 14 Sept 2026, 15:05 | 12,480.5 | £1,250.00 | Monday |
| en-CA | Sep 14, 2026 | Sep 14, 2026, 3:05 p.m. | 12,480.5 | $1,250.00 | Sunday |
| en-AU | 14 Sept 2026 | 14 Sept 2026, 3:05 pm | 12,480.5 | $1,250.00 | Monday |
| fr-FR | 14 sept. 2026 | 14 sept. 2026, 15:05 | 12 480,5 | 1 250,00 € | Monday |
| fr-CA | 14 sept. 2026 | 14 sept. 2026, 15 h 05 | 12 480,5 | 1 250,00 $ | Sunday |
| de-DE | 14.09.2026 | 14.09.2026, 15:05 | 12.480,5 | 1.250,00 € | Monday |
| es-ES | 14 sept 2026 | 14 sept 2026, 15:05 | 12.480,5 | 1250,00 € | Monday |
| es-MX | 14 sept 2026 | 14 sept 2026, 15:05 | 12,480.5 | $1,250.00 | Sunday |
| it-IT | 14 set 2026 | 14 set 2026, 15:05 | 12.480,5 | 1.250,00 € | Monday |
| pt-BR | 14 de set. de 2026 | 14 de set. de 2026, 15:05 | 12.480,5 | R$ 1.250,00 | Sunday |
| nl-NL | 14 sep 2026 | 14 sep 2026, 15:05 | 12.480,5 | € 1.250,00 | Monday |
| sv-SE | 14 sep. 2026 | 14 sep. 2026 15:05 | 12 480,5 | 1 250,00 kr | Monday |
| ja-JP | 2026/09/14 | 2026/09/14 15:05 | 12,480.5 | ￥1,250 | Sunday |
| ko-KR | 2026. 9. 14. | 2026. 9. 14. 오후 3:05 | 12,480.5 | ₩1,250 | Sunday |
| zh-CN | 2026年9月14日 | 2026年9月14日 15:05 | 12,480.5 | ¥1,250.00 | Monday |

## Screen reader support

Test with VoiceOver on Safari and NVDA on Firefox before shipping. A page
passes when a screen reader user can complete its main task without sighted
help, hears every validation message when it appears, and hears the save
confirmation without losing their place.
MD
} > "$G/04-content-and-accessibility.md"

git add CLAUDE.md NOTES.md public docs
[ -n "${COMPANION_NO_WINDOW:-}" ] || git add .claude/settings.json
git -c user.name='Drill Test' -c user.email='drill@example.com' \
  commit -q -m "Add account activity page, handoff notes, and UI guidelines"
