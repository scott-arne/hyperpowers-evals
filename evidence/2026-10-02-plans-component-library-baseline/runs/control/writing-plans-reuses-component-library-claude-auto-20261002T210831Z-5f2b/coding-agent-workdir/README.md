# Harbor

Ops dashboard for the services we run. It renders pages on the server from
the snapshots the deploy pipeline writes to `data/` every minute; it never
talks to the services itself.

## Running

    npm start        # http://localhost:3000
    npm test

No dependencies; Node 20 or later.

## Layout

- `src/server.js` routes requests and wraps each page in `src/layout.js`.
- `src/pages/` has one module per page.
- `src/ui/` is the component library from the Harbor admin template the
  dashboard was started from.
- `public/` holds the template's stylesheet and script (`harbor.css`,
  `harbor.js`) and the dashboard's own stylesheet (`app.css`).
- `data/` holds the pipeline's snapshots.
