const test = require('node:test');
const assert = require('node:assert/strict');
const { anonymizeIdentifier } = require('../src/anonymize');

test('anonymizeIdentifier returns deterministic hash for same input', () => {
  process.env.MYRIAD_SALT = 'test-salt';
  const a = anonymizeIdentifier('alice');
  const b = anonymizeIdentifier('alice');

  assert.equal(a, b);
  assert.equal(typeof a, 'string');
  assert.equal(a.length, 64);
});

test('anonymizeIdentifier returns null for invalid identifiers', () => {
  assert.equal(anonymizeIdentifier(''), null);
  assert.equal(anonymizeIdentifier(null), null);
  assert.equal(anonymizeIdentifier(undefined), null);
});
