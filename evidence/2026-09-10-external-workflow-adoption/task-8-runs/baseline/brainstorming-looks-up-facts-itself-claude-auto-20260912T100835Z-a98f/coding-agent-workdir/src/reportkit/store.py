"""PostgreSQL access for the billing tables."""

from __future__ import annotations

import os
from collections.abc import Sequence

import psycopg


def connect() -> psycopg.Connection:
    """Open a connection using DATABASE_URL."""
    return psycopg.connect(os.environ["DATABASE_URL"])


def daily_rows(conn: psycopg.Connection, day: str) -> Sequence[tuple[str, int]]:
    """Return one (account_id, cents) row per billed account for `day`."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT account_id, cents FROM billing_daily "
            "WHERE day = %s ORDER BY account_id",
            (day,),
        )
        return cur.fetchall()
