// data/costs.json: Month-to-date spend against each service budget.
// Checked by the pipeline before it writes the file, and by tools/verify.
export const key = 'budgets';

export const fields = {
  service: 'string',
  team: 'string',
  budget: 'string',
  spent: 'string',
  status: 'string',
};
