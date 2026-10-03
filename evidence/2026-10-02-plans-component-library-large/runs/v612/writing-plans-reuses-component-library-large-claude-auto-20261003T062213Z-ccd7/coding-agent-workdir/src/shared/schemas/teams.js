// data/teams.json: Teams, their leads and their on-call rotation size.
// Checked by the pipeline before it writes the file, and by tools/verify.
export const key = 'teams';

export const fields = {
  name: 'string',
  area: 'string',
  lead: 'string',
  members: 'number',
  channel: 'string',
  staffing: 'string',
};
