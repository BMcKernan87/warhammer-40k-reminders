import { test, expect } from 'vitest';
import { ruleSchema, provenanceSchema } from '../src/data/schema';
import { validateRules, profileFor } from '../src/sources';
import { rules } from '../src/data/rules';
const sample = rules.find((r) => r.id === 'plasmancer-critical')!;
test('a link alone cannot be marked checked', () => {
  expect(provenanceSchema.safeParse({ status: 'checked', url: sample.source.url }).success).toBe(false);
  expect(
    ruleSchema.safeParse({ ...sample, slots: [{ phase: 'Psychic', timing: 'during', turn: 'your' }] })
      .success,
  ).toBe(false);
  expect(
    ruleSchema.safeParse({ ...sample, source: { ...sample.source, url: 'http://example.com' } }).success,
  ).toBe(false);
  expect(ruleSchema.safeParse({ ...sample, scope: { kind: 'unit', family: 'necrons' } }).success).toBe(false);
});
test('cross-validates duplicate IDs and interactions against the Bodyguard profile', () => {
  expect(() => validateRules([sample, sample], [], [])).toThrow(/Duplicate/);
  expect(() => validateRules([sample], [], [profileFor('necrons', 'plasmancer')!])).toThrow(/equipment/);
  const wrong = {
    ...sample,
    scope: { kind: 'detachment' as const, family: 'orks', detachment: 'hypercrypt-legion' },
    interactions: [],
  };
  expect(() => validateRules([wrong], [], [])).toThrow(/detachment/);
});
