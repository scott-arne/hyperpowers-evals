"""Plain-text notes: add and list."""
import sys
from datetime import date
from pathlib import Path

STORE = Path("notes.txt")


def add(text: str) -> None:
    with STORE.open("a") as fh:
        fh.write(f"{date.today().isoformat()}\t{text}\n")


def load() -> list[tuple[str, str]]:
    if not STORE.exists():
        return []
    rows = []
    for line in STORE.read_text().splitlines():
        when, _, text = line.partition("\t")
        rows.append((when, text))
    return rows


def list_notes() -> list[str]:
    rows = sorted(load(), key=lambda r: r[1])
    return [f"{when}  {text}" for when, text in rows]


def main(argv: list[str]) -> int:
    if not argv:
        print("usage: notes.py add <text> | list")
        return 2
    if argv[0] == "add":
        add(" ".join(argv[1:]))
        return 0
    if argv[0] == "list":
        for line in list_notes():
            print(line)
        return 0
    print(f"unknown command: {argv[0]}")
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
