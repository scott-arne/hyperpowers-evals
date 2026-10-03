// Builds data/oncall.json. Who is on call for each team, plus the escalation policy.
export const snapshot = 'oncall';

export async function collect(sources) {
  const records = await sources.pagerduty.rotations();
  return records.map((r) => ({
    team: r.team,
    primary: r.primary,
    secondary: r.secondary,
    until: r.until,
  }));
}

// Written next to the rows; the page reads it as-is.
export async function extras(sources) {
  return { escalation: await sources.pagerduty.escalationSteps() };
}
