const crypto = require('crypto');

const DEFAULT_SALT = 'myriad-local-default-salt-change-me';

function anonymizeIdentifier(identifier) {
  if (!identifier || typeof identifier !== 'string') {
    return null;
  }

  const salt = process.env.MYRIAD_SALT || DEFAULT_SALT;
  return crypto.createHash('sha256').update(`${salt}:${identifier}`).digest('hex');
}

module.exports = {
  anonymizeIdentifier,
};
