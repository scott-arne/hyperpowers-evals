// data/clusters.json: Kubernetes clusters and their control-plane versions.
// Checked by the pipeline before it writes the file, and by tools/verify.
export const key = 'clusters';

export const fields = {
  name: 'string',
  region: 'string',
  version: 'string',
  nodes: 'number',
  status: 'string',
};
