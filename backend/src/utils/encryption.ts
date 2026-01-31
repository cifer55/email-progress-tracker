/**
 * Encryption utilities for securing sensitive data
 * Requirements: 1.4, 11.1
 */

import crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64;

/**
 * Get encryption key from environment or generate one
 * In production, this should come from a secure key management service
 */
function getEncryptionKey(): Buffer {
  const keyString = process.env.ENCRYPTION_KEY;
  
  if (!keyString) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  
  // Derive a key from the environment variable using PBKDF2
  const salt = process.env.ENCRYPTION_SALT || 'default-salt-change-in-production';
  return crypto.pbkdf2Sync(keyString, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt a string value
 * Uses AES-256-GCM for authenticated encryption
 * 
 * @param plaintext - The text to encrypt
 * @returns Encrypted string in format: iv:authTag:ciphertext (all base64 encoded)
 */
export function encrypt(plaintext: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    // Return format: iv:authTag:ciphertext (all base64 encoded)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext}`;
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt an encrypted string
 * 
 * @param encryptedData - Encrypted string in format: iv:authTag:ciphertext
 * @returns Decrypted plaintext
 */
export function decrypt(encryptedData: string): string {
  try {
    const key = getEncryptionKey();
    
    // Parse the encrypted data
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const ciphertext = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');
    
    return plaintext;
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a new encryption key
 * This should be run once during initial setup and stored securely
 * 
 * @returns Base64 encoded encryption key
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('base64');
}

/**
 * Generate a new salt for key derivation
 * This should be run once during initial setup and stored securely
 * 
 * @returns Base64 encoded salt
 */
export function generateSalt(): string {
  return crypto.randomBytes(SALT_LENGTH).toString('base64');
}

/**
 * Hash a password using bcrypt-style PBKDF2
 * Used for storing user passwords (not for encryption keys)
 * 
 * @param password - Password to hash
 * @returns Hashed password in format: salt:hash
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
  
  return `${salt.toString('base64')}:${hash.toString('base64')}`;
}

/**
 * Verify a password against a hash
 * 
 * @param password - Password to verify
 * @param hashedPassword - Hashed password in format: salt:hash
 * @returns True if password matches
 */
export function verifyPassword(password: string, hashedPassword: string): boolean {
  try {
    const parts = hashedPassword.split(':');
    if (parts.length !== 2) {
      return false;
    }
    
    const salt = Buffer.from(parts[0], 'base64');
    const originalHash = Buffer.from(parts[1], 'base64');
    
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
    
    // Use timingSafeEqual to prevent timing attacks
    return crypto.timingSafeEqual(originalHash, hash);
  } catch (error) {
    return false;
  }
}

/**
 * Rotate encryption key
 * Re-encrypts all data with a new key
 * This is a placeholder - actual implementation would need to:
 * 1. Generate new key
 * 2. Decrypt all encrypted data with old key
 * 3. Re-encrypt with new key
 * 4. Update key in secure storage
 * 
 * @param oldKey - Old encryption key
 * @param newKey - New encryption key
 * @param encryptedData - Data to re-encrypt
 * @returns Re-encrypted data
 */
export function rotateKey(oldKey: string, newKey: string, encryptedData: string): string {
  // This is a simplified implementation
  // In production, this would need to handle key rotation across the entire database
  
  // Temporarily set old key
  const originalKey = process.env.ENCRYPTION_KEY;
  process.env.ENCRYPTION_KEY = oldKey;
  
  try {
    // Decrypt with old key
    const plaintext = decrypt(encryptedData);
    
    // Set new key
    process.env.ENCRYPTION_KEY = newKey;
    
    // Encrypt with new key
    const reencrypted = encrypt(plaintext);
    
    return reencrypted;
  } finally {
    // Restore original key
    process.env.ENCRYPTION_KEY = originalKey;
  }
}
