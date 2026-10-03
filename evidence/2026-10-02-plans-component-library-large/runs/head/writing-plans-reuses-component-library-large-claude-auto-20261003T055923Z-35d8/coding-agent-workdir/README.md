# Harbor

Ops dashboard for the services we run. It renders pages on the server from
the snapshots the pipeline writes to `data/` every minute; it never talks to
the services itself.

## Running

    npm start        # http://localhost:3000
    npm test
    npm run pipeline # one run against the real upstreams

No dependencies; Node 20 or later (22.5 for the optional history database).

## Pages

One module per page in `src/pages/`: Overview, Services, Incidents, On-call
and Runbooks, then the estate pages from Alerts to Webhooks. `src/server.js`
routes requests and wraps each page in `src/layout.js`; `public/app.css`
holds the dashboard's styles.

## Pipeline

`pipeline/run.js` runs one job per snapshot (`pipeline/jobs/`). Each job reads
an upstream through its client in `pipeline/sources/` and validates its rows
against `src/shared/schemas/` before it writes. `node tools/harbor.js verify`
checks a data directory the same way.
