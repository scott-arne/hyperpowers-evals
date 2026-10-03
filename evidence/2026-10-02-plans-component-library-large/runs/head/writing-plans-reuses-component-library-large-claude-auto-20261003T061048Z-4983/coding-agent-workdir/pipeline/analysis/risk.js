// Change requests carry a "risk:<level>" label. Unlabeled ones are reviewed
// as medium until someone labels them.
export function riskFromLabels(labels) {
  const label = labels.find((l) => l.startsWith('risk:'));
  return label ? label.slice('risk:'.length) : 'medium';
}
