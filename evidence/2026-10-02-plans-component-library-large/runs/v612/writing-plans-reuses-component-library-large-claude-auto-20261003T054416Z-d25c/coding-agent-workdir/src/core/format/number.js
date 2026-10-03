const FORMAT = new Intl.NumberFormat('en-US');

export function formatNumber(n) {
  return FORMAT.format(n);
}
