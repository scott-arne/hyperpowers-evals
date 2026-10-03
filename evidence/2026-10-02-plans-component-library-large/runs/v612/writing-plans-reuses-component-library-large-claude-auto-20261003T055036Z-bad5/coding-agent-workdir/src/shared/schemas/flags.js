// data/flags.json: Feature flags and their rollout in each environment.
// Checked by the pipeline before it writes the file, and by tools/verify.
export const key = 'flags';

export const fields = {
  name: 'string',
  environment: 'string',
  state: 'string',
  rollout: 'string',
  owner: 'string',
  updatedAt: 'timestamp',
};
