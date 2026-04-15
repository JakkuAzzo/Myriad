const crypto = require('crypto');

const DEFAULT_SALT = 'myriad-local-default-salt-change-me';

function isStrictSaltMode() {
  return process.env.NODE_ENV === 'production' || process.env.MYRIAD_REQUIRE_STRONG_SALT === 'true';
}

function isDefaultSaltInUse() {
  const salt = process.env.MYRIAD_SALT || DEFAULT_SALT;
  return salt === DEFAULT_SALT;
}

function validateSaltConfiguration() {
  if (!isStrictSaltMode()) {
    return;
  }

  if (isDefaultSaltInUse()) {
    throw new Error(
      'MYRIAD_SALT is required in strict mode. Set a strong, unique salt before starting Myriad.'
    );
  }
}

function getSaltConfigurationStatus() {
  return {
    strictMode: isStrictSaltMode(),
    usingDefaultSalt: isDefaultSaltInUse(),
    warning: isDefaultSaltInUse()
      ? 'Myriad is using the development default anonymization salt. Configure MYRIAD_SALT for real usage.'
      : null,
  };
}

function anonymizeIdentifier(identifier) {
  if (!identifier || typeof identifier !== 'string') {
    return null;
  }

  const salt = process.env.MYRIAD_SALT || DEFAULT_SALT;
  return crypto.createHash('sha256').update(`${salt}:${identifier}`).digest('hex');
}

module.exports = {
  DEFAULT_SALT,
  anonymizeIdentifier,
  validateSaltConfiguration,
  getSaltConfigurationStatus,
};
