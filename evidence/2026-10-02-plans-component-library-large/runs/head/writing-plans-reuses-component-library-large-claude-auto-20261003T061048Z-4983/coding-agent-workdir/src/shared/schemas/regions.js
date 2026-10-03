// data/regions.json: Cloud regions and the provider status for each.
// Checked by the pipeline before it writes the file, and by tools/verify.
export const key = 'regions';

export const fields = {
  name: 'string',
  provider: 'string',
  services: 'number',
  status: 'string',
};
