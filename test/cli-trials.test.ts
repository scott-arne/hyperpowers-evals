import { expect, test } from 'bun:test';
import { summarizeTrials, trialSymbol } from '../src/cli/trials.ts';

test('trialSymbol maps every terminal state', () => {
  expect(trialSymbol('pass')).toBe('P');
  expect(trialSymbol('fail')).toBe('F');
  expect(trialSymbol('indeterminate')).toBe('I');
});

test('a single trial exits exactly as an unrepeated run does', () => {
  expect(summarizeTrials(['pass'])).toEqual({ vector: 'P', exitCode: 0 });
  expect(summarizeTrials(['fail'])).toEqual({ vector: 'F', exitCode: 1 });
  expect(summarizeTrials(['indeterminate'])).toEqual({
    vector: 'I',
    exitCode: 2,
  });
});

test('fail takes precedence over indeterminate', () => {
  expect(summarizeTrials(['pass', 'indeterminate', 'fail'])).toEqual({
    vector: 'PIF',
    exitCode: 1,
  });
  expect(summarizeTrials(['fail', 'indeterminate'])).toEqual({
    vector: 'FI',
    exitCode: 1,
  });
});

test('indeterminate takes precedence over pass', () => {
  expect(summarizeTrials(['pass', 'indeterminate', 'pass'])).toEqual({
    vector: 'PIP',
    exitCode: 2,
  });
});

test('exit 0 requires every trial to have passed', () => {
  expect(summarizeTrials(['pass', 'pass', 'pass'])).toEqual({
    vector: 'PPP',
    exitCode: 0,
  });
});

test('the vector preserves trial order', () => {
  expect(
    summarizeTrials(['indeterminate', 'pass', 'fail', 'pass']).vector,
  ).toBe('IPFP');
});
