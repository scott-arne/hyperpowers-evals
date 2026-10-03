// Slack channels per team, for the "ask in" hints on incident pages.
export const CHANNELS = {
  data: '#team-data',
  identity: '#team-identity',
  messaging: '#team-messaging',
  payments: '#team-payments',
  platform: '#team-platform',
  search: '#team-search',
};

export function channelFor(team) {
  return CHANNELS[team] ?? '#ops';
}
