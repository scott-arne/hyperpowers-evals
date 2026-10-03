// Builds data/certificates.json. Certificates found by the last scan, with their expiry.
import { certStatus } from '../analysis/expiry.js';

export const snapshot = 'certificates';

export async function collect(sources, { now }) {
  const records = await sources.certScanner.certificates();
  return records.map((r) => ({
    domain: r.domain,
    issuer: r.issuer,
    expiresAt: r.expires_at,
    status: certStatus(r.expires_at, now),
  }));
}
