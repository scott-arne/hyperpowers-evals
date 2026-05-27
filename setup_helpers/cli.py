"""CLI for setup helpers: `setup-helpers run <helper> [<helper>...]`.

Scenario setup.sh scripts use this instead of an inline
`uv run python -c "..."` block. Each named helper is looked up in
HELPER_REGISTRY and invoked against $BARF_WORKDIR. Helpers that need
a fixture template or the superpowers root receive them by signature
introspection — `template_dir` and `superpowers_root` params are filled
from $BARF_REPO_ROOT and $SUPERPOWERS_ROOT respectively.
"""

from __future__ import annotations

import inspect
import os
import sys
from pathlib import Path

from setup_helpers import HELPER_REGISTRY


def _run(names: list[str]) -> int:
    workdir_env = os.environ.get("BARF_WORKDIR")
    if not workdir_env:
        print("setup-helpers: BARF_WORKDIR is not set", file=sys.stderr)
        return 1
    workdir = Path(workdir_env)

    for name in names:
        helper = HELPER_REGISTRY.get(name)
        if helper is None:
            print(
                f"setup-helpers: unknown helper {name!r}; known: "
                f"{', '.join(sorted(HELPER_REGISTRY))}",
                file=sys.stderr,
            )
            return 1
        params = inspect.signature(helper).parameters
        if next(iter(params), None) != "workdir":
            print(
                f"setup-helpers: {name!r} is not a workdir-style helper "
                f"(params: {list(params)}); invoke it directly instead",
                file=sys.stderr,
            )
            return 1
        kwargs: dict[str, object] = {}
        if "template_dir" in params:
            repo_root = os.environ.get("BARF_REPO_ROOT")
            if not repo_root:
                print("setup-helpers: BARF_REPO_ROOT is not set", file=sys.stderr)
                return 1
            kwargs["template_dir"] = Path(repo_root) / "fixtures" / "template-repo"
        if "superpowers_root" in params:
            sp_root = os.environ.get("SUPERPOWERS_ROOT")
            if not sp_root:
                print("setup-helpers: SUPERPOWERS_ROOT is not set", file=sys.stderr)
                return 1
            kwargs["superpowers_root"] = sp_root
        # HELPER_REGISTRY is a heterogeneous registry; the runtime signature
        # introspection above guarantees the call is correct.
        helper(workdir, **kwargs)  # ty: ignore[invalid-argument-type]
    return 0


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    if len(argv) < 2 or argv[0] != "run":
        print(
            "usage: setup-helpers run <helper> [<helper>...]",
            file=sys.stderr,
        )
        return 2
    return _run(argv[1:])


if __name__ == "__main__":
    sys.exit(main())
