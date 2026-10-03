// data/slos.json: Objectives and their remaining error budget this month.
// Checked by the pipeline before it writes the file, and by tools/verify.
export const key = 'slos';

export const fields = {
  name: 'string',
  service: 'string',
  target: 'string',
  current: 'string',
  budgetLeft: 'number',
  status: 'string',
};
