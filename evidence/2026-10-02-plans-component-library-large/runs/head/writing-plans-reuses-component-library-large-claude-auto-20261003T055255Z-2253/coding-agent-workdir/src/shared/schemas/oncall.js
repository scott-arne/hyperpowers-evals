// data/oncall.json: Who is on call for each team, plus the escalation policy.
// Checked by the pipeline before it writes the file, and by tools/verify.
export const key = 'rotations';

export const fields = {
  team: 'string',
  primary: 'string',
  secondary: 'string',
  until: 'timestamp',
};
