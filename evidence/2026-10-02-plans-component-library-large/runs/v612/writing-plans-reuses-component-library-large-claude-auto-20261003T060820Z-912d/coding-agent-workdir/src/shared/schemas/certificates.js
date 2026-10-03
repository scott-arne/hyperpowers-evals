// data/certificates.json: Certificates found by the last scan, with their expiry.
// Checked by the pipeline before it writes the file, and by tools/verify.
export const key = 'certificates';

export const fields = {
  domain: 'string',
  issuer: 'string',
  expiresAt: 'timestamp',
  status: 'string',
};
