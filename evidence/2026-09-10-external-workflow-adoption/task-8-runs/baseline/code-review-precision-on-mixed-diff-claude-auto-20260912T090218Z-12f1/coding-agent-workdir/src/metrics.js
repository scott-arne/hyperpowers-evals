export async function recordLatency(name, ms) {
  // Best-effort telemetry. Callers deliberately do not await this.
  await fetch("http://metrics.internal/v1/timing", {
    method: "POST",
    body: JSON.stringify({ name, ms }),
  }).catch(() => {});
}
