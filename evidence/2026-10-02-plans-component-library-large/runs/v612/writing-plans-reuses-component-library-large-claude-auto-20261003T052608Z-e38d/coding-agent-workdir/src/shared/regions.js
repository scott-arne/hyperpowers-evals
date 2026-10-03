// Display names for the cloud regions we run in.
export const REGION_NAMES = {
  'eu-west-1': 'Ireland',
  'eu-central-1': 'Frankfurt',
  'us-east-1': 'N. Virginia',
  'us-west-2': 'Oregon',
  'ap-southeast-1': 'Singapore',
};

export function regionName(code) {
  return REGION_NAMES[code] ?? code;
}
