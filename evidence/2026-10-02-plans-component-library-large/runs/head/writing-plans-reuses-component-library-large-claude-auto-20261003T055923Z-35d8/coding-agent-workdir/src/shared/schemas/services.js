// data/services.json: Deployed services and their health checks, one row per service and environment.
// Checked by the pipeline before it writes the file, and by tools/verify.
export const key = 'services';

export const fields = {
  name: 'string',
  version: 'string',
  environment: 'string',
  health: 'string',
  deployedAt: 'timestamp',
};
