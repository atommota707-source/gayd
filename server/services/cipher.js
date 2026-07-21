import crypto from 'crypto';

export function generateCipher() {
  return crypto.randomBytes(24).toString('base64url');
}

export function verifyCipher(inputCipher, storedCipher) {
  return inputCipher.trim() === storedCipher;
}
