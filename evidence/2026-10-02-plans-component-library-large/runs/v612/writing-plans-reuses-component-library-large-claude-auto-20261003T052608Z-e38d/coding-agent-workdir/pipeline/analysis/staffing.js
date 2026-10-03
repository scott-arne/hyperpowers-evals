// A rotation needs four people for nobody to be on call more than one week
// in four.
export function staffingFor(rotationSize) {
  return rotationSize >= 4 ? 'staffed' : 'short';
}
