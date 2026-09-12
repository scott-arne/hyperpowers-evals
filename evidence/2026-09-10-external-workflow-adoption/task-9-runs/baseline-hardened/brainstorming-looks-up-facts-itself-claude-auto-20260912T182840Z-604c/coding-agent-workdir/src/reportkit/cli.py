"""Command-line entry point."""

from __future__ import annotations

import click

from reportkit.store import connect, daily_rows
from reportkit.summarize import render_text


@click.group()
def main() -> None:
    """reportkit command-line interface."""


@main.command()
@click.option("--day", required=True, help="Day to summarize, YYYY-MM-DD.")
def summarize(day: str) -> None:
    """Print the plain-text summary for one day."""
    with connect() as conn:
        click.echo(render_text(daily_rows(conn, day)))
