# svc

Command-line status for the services we run. `svc` reads the snapshot the
deploy pipeline writes to `data/services.json` every minute; it never talks to
the services itself.

## Usage

    node bin/svc.js status
    node bin/svc.js status --data path/to/snapshot.json

The `HEALTH` column reads `ok` when every check passes, and otherwise names
the failing checks.

## Snapshot format

The snapshot names its `environment` and when it was taken (`generatedAt`).
Each entry in `services` has:

- `name` and `version`;
- `replicas`: `ready` and `desired` counts;
- `deployedAt`: when the running version was deployed;
- `health`: when the checks last ran (`checkedAt`) and the result of each
  check (`checks`, each with a `name`, a `status` of `passing` or `failing`,
  and a `detail` when it is failing).

## Tests

    npm test
