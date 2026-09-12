export function applyCoupon(cents, coupon) {
  if (!coupon) {
    return cents;
  }
  if (coupon.kind === "pct") {
    return cents - Math.round((cents * coupon.value) / 100);
  }
  return Math.max(0, cents - coupon.value);
}

export function cartTotal(lines) {
  return lines.reduce((sum, l) => sum + l.unitCents * l.qty, 0);
}

export function shippingCents(subtotalCents) {
  return subtotalCents >= 5000 ? 0 : 599;
}
