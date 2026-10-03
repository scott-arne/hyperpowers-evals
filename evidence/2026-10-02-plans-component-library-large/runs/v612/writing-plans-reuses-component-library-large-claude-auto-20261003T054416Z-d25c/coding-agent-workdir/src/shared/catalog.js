// Which team owns each service. The pipeline stamps it on incidents and
// costs; on-call uses it to page the right rotation.
export const OWNERS = {
  'api-gateway': 'platform',
  auth: 'identity',
  billing: 'payments',
  catalog: 'search',
  checkout: 'payments',
  ledger: 'payments',
  media: 'messaging',
  notifications: 'messaging',
  reports: 'data',
  scheduler: 'platform',
  search: 'search',
  webhooks: 'platform',
};

export function ownerOf(service) {
  return OWNERS[service] ?? 'platform';
}
