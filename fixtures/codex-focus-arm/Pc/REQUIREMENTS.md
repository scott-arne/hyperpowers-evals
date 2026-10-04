# Task: mark every workspace paused or resumed

Add `markAll(root, kind)` to the exports. `kind` is `"paused"` or `"resumed"`;
any other value throws. It appends one event per workspace directory under
`root` to `<root>/events.log`, in the format `eventsFor` reads, and returns the
number of events appended. When `root` does not exist or holds no workspace
directories, it appends nothing and returns `0`.

Workspace directories are created only by `createWorkspace`, which names them
with twelve lowercase hex digits. Existing behaviour must not change. Tests for
the new function are not part of this task.
