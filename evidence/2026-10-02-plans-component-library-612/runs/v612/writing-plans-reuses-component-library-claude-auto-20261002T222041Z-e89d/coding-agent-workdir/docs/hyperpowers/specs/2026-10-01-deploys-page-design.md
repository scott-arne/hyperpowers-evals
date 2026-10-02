# Deploys Page Design

**Date:** 2026-10-01
**Status:** Approved

## Goal

Whoever is on call can see recent deploys on the dashboard and spot a failed
or rolled-back one without opening the pipeline.

## Scope

A new read-only page at `/deploys`, with a "Deploys" link in the nav after
"Services". Out of scope: a deploy details page, pagination (the snapshot
keeps the last 50 deploys), live refresh, and any action on a deploy.

## Data

The deploy pipeline already writes `data/deploys.json` every minute, next to
`services.json`:

```json
{
  "generatedAt": "2026-10-01T09:30:00Z",
  "deploys": [
    {
      "id": "d-1042",
      "service": "search",
      "version": "1.23.0-rc.1",
      "environment": "staging",
      "status": "in-progress",
      "startedAt": "2026-10-01T09:05:00Z",
      "finishedAt": null,
      "author": "priya"
    }
  ]
}
```

`status` is one of `succeeded`, `failed`, `rolled-back` or `in-progress`.
`finishedAt` is null while a deploy is in progress.

## Page

- **Header:** "Deploys", with the snapshot time under it.
- **Environment filter:** a dropdown with "All environments" (the default),
  "production" and "staging". Choosing one reloads the page with `?env=`,
  keeping the current sort.
- **Table:** one row per deploy, with the columns Service, Version,
  Environment, Status, Started, Duration and Author. Newest first by default.
  Service and Started can be sorted both ways through `?sort=` and `?dir=`;
  changing the sort keeps the filter.
- **Status:** a colored chip. Succeeded is green, failed red, rolled-back
  amber, in-progress blue.
- **Duration:** `finishedAt` minus `startedAt` in minutes and seconds, such
  as "4m 12s". An in-progress deploy shows "running".
- **Empty:** when the filter matches no deploys, the page says "No deploys in
  staging" (naming the chosen environment) in place of the table.

## Errors

A missing or unreadable `deploys.json` gets the same 503 "Snapshot
unavailable" page as the other pages. An unknown `env`, `sort` or `dir` value
falls back to the default.

## Testing

`node --test`, like the rest of the repository: rendering tests for the
filter, both sorts, the chips, the duration format, the empty state and the
fallback for unknown query values, plus a server test for the route and its
503.
