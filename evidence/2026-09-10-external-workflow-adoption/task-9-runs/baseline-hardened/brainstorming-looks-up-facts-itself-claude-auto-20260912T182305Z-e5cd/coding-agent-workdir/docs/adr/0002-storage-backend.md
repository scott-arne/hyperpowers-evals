# 2. PostgreSQL is the only storage backend

Date: 2024-11-08
Status: accepted

## Context

reportkit 1.x could read the billing tables from either SQLite or
PostgreSQL. The SQLite path diverged: it lacked the row locking the
nightly job depends on, and two of its aggregate queries returned
different totals under concurrent writes.

## Decision

PostgreSQL is the only supported backend. The connection string comes
from DATABASE_URL. The SQLite path was removed in 2.0 and will not
come back.

## Consequences

reportkit.store may use PostgreSQL-specific SQL freely. Any feature
that needs a second backend reopens this record first.
