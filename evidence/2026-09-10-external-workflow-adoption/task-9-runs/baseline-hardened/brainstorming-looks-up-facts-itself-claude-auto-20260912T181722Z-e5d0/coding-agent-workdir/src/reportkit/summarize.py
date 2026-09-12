"""Summary rendering for the nightly report."""

from __future__ import annotations

from collections.abc import Sequence


def render_text(rows: Sequence[tuple[str, int]]) -> str:
    """Render rows as the plain-text summary the cron job emails."""
    lines = [f"{account}: {cents / 100:.2f}" for account, cents in rows]
    total = sum(cents for _, cents in rows)
    lines.append(f"total: {total / 100:.2f}")
    return "\n".join(lines)
