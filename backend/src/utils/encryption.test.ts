/**
 * Unit tests for encryption utilities
 * Requirements: 1.4, 11.1
 */

import * as fc from 'fast-check';
import {
  encrypt,
  decrypt,
  generateEncryptionKey,
  generateSalt,
  hashPassword,
  verifyPassword,
  rotateKey,
} from './encryption';

describe('Encryption Utilities', () => {
  // Set up test environment variables
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = generateEncryptionKey();
    process.env.ENCRYPTION_SALT = generateSalt();
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt a simple string', () => {
      const plaintext = 'Hello, World!';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
      expect(encrypted).not.toBe(plaintext);
    });

    it('should encrypt and decrypt an empty string', () => {
      const plaintext = '';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt special characters', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt unicode characters', () => {
      const plaintext = '你好世界 🌍 مرحبا بالعالم';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext', () => {
      const plaintext = 'test message';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });

    it('should throw error when decrypting invalid data', () => {
      expect(() => decrypt('invalid:data:format')).toThrow();
      expect(() => decrypt('not-base64:not-base64:not-base64')).toThrow();
      expect(() => decrypt('only-two:parts')).toThrow();
    });

    it('should throw error when encryption key is missing', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY environment variable is not set');

      process.env.ENCRYPTION_KEY = originalKey;
    });

    it('should handle long strings', () => {
      const plaintext = 'a'.repeat(10000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle newlines and whitespace', () => {
      const plaintext = 'Line 1\nLine 2\r\nLine 3\t\tTabbed';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('hashPassword and verifyPassword', () => {
    it('should hash and verify a password', () => {
      const password = 'mySecurePassword123!';
      const hashed = hashPassword(password);

      expect(verifyPassword(password, hashed)).toBe(true);
      expect(hashed).not.toBe(password);
    });

    it('should reject incorrect password', () => {
      const password = 'correctPassword';
      const hashed = hashPassword(password);

      expect(verifyPassword('wrongPassword', hashed)).toBe(false);
    });

    it('should produce different hashes for same password', () => {
      const password = 'samePassword';
      const hashed1 = hashPassword(password);
      const hashed2 = hashPassword(password);

      expect(hashed1).not.toBe(hashed2);
      expect(verifyPassword(password, hashed1)).toBe(true);
      expect(verifyPassword(password, hashed2)).toBe(true);
    });

    it('should handle empty password', () => {
      const password = '';
      const hashed = hashPassword(password);

      expect(verifyPassword(password, hashed)).toBe(true);
      expect(verifyPassword('notEmpty', hashed)).toBe(false);
    });

    it('should reject malformed hash', () => {
      expect(verifyPassword('password', 'invalid-hash')).toBe(false);
      expect(verifyPassword('password', 'only-one-part')).toBe(false);
    });

    it('should be case sensitive', () => {
      const password = 'CaseSensitive';
      const hashed = hashPassword(password);

      expect(verifyPassword('CaseSensitive', hashed)).toBe(true);
      expect(verifyPassword('casesensitive', hashed)).toBe(false);
      expect(verifyPassword('CASESENSITIVE', hashed)).toBe(false);
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate a valid base64 key', () => {
      const key = generateEncryptionKey();

      expect(key).toBeTruthy();
      expect(typeof key).toBe('string');
      expect(Buffer.from(key, 'base64').length).toBe(32); // 256 bits
    });

    it('should generate unique keys', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();

      expect(key1).not.toBe(key2);
    });
  });

  describe('generateSalt', () => {
    it('should generate a valid base64 salt', () => {
      const salt = generateSalt();

      expect(salt).toBeTruthy();
      expect(typeof salt).toBe('string');
      expect(Buffer.from(salt, 'base64').length).toBe(64);
    });

    it('should generate unique salts', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();

      expect(salt1).not.toBe(salt2);
    });
  });

  describe('rotateKey', () => {
    it('should re-encrypt data with new key', () => {
      const plaintext = 'sensitive data';
      const oldKey = generateEncryptionKey();
      const newKey = generateEncryptionKey();

      // Encrypt with old key
      process.env.ENCRYPTION_KEY = oldKey;
      const encrypted = encrypt(plaintext);

      // Rotate to new key
      const reencrypted = rotateKey(oldKey, newKey, encrypted);

      // Decrypt with new key
      process.env.ENCRYPTION_KEY = newKey;
      const decrypted = decrypt(reencrypted);

      expect(decrypted).toBe(plaintext);
      expect(reencrypted).not.toBe(encrypted);
    });
  });

  // Property-based tests
  describe('Property-Based Tests', () => {
    it('Property 5: Credential Security - Encryption is reversible for all strings', () => {
      fc.assert(
        fc.property(fc.string(), (plaintext) => {
          const encrypted = encrypt(plaintext);
          const decrypted = decrypt(encrypted);
          return decrypted === plaintext;
        }),
        { numRuns: 100 }
      );
    });

    it('Property 5: Credential Security - Same plaintext produces different ciphertext', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1 }), (plaintext) => {
          const encrypted1 = encrypt(plaintext);
          const encrypted2 = encrypt(plaintext);
          // Different ciphertext but same plaintext when decrypted
          return encrypted1 !== encrypted2 && decrypt(encrypted1) === decrypt(encrypted2);
        }),
        { numRuns: 100 }
      );
    });

    it('Property 5: Credential Security - Password hashing is consistent', () => {
      fc.assert(
        fc.property(fc.string(), (password) => {
          const hashed = hashPassword(password);
          return verifyPassword(password, hashed);
        }),
        { numRuns: 100 }
      );
    });

    it('Property 5: Credential Security - Wrong password always fails', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          (password1, password2) => {
            if (password1 === password2) return true; // Skip if same
            const hashed = hashPassword(password1);
            return !verifyPassword(password2, hashed);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 5: Credential Security - Encrypted data format is consistent', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1 }), (plaintext) => {
          const encrypted = encrypt(plaintext);
          const parts = encrypted.split(':');
          // Should have exactly 3 parts: iv:authTag:ciphertext
          return parts.length === 3 && parts.every((part) => part.length > 0);
        }),
        { numRuns: 100 }
      );
    });
  });
});
