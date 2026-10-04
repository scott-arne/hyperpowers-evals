# Task: report and count workspaces

Add `formatWorkspaces(root)` to the exports. It returns one line per workspace
directory under `root`, in `listWorkspaces` order, each line the directory name
followed by a newline; `""` when `root` does not exist.

Add `countWorkspaces(root)` to the exports. It returns the number of workspace
directories under `root`; `0` when `root` does not exist.

Workspace directories are created only by `createWorkspace`, which names them
with twelve lowercase hex digits. Existing behaviour must not change. Tests for
the new functions are not part of this task.
