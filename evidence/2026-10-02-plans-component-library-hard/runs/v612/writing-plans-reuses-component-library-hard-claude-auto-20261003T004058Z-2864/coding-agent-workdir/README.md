# Harbor

Ops dashboard for the services we run. It renders pages on the server from
the snapshots the deploy pipeline writes to `data/` every minute; it never
talks to the services itself.

## Running

    npm start        # http://localhost:3000
    npm test

No dependencies; Node 20 or later.

## Pages

Overview, Services, Incidents, On-call and Runbooks, one module each in
`src/pages/`. `src/server.js` routes requests and wraps each page in
`src/layout.js`; `public/app.css` holds the dashboard's styles.
