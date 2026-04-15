const test = require('node:test');
const assert = require('node:assert/strict');
const {
  anonymizeIdentifier,
  validateSaltConfiguration,
  getSaltConfigurationStatus,
} = require('../src/anonymize');

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

test('salt status reports warning when default salt is used', () => {
  delete process.env.MYRIAD_SALT;
  const status = getSaltConfigurationStatus();
  assert.equal(status.usingDefaultSalt, true);
  assert.ok(typeof status.warning === 'string');
});

test('validateSaltConfiguration throws in strict mode with default salt', () => {
  const oldNodeEnv = process.env.NODE_ENV;
  const oldSalt = process.env.MYRIAD_SALT;

  process.env.NODE_ENV = 'production';
  delete process.env.MYRIAD_SALT;

  assert.throws(() => validateSaltConfiguration(), /MYRIAD_SALT is required/);

  process.env.NODE_ENV = oldNodeEnv;
  if (oldSalt === undefined) {
    delete process.env.MYRIAD_SALT;
  } else {
    process.env.MYRIAD_SALT = oldSalt;
  }
});
