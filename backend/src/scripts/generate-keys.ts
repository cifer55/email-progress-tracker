/**
 * Script to generate encryption keys
 * Run with: npm run generate-keys
 */

import { generateEncryptionKey, generateSalt } from '../utils/encryption';

console.log('=== Encryption Key Generation ===\n');

const encryptionKey = generateEncryptionKey();
const salt = generateSalt();

console.log('Add these to your .env file:\n');
console.log(`ENCRYPTION_KEY=${encryptionKey}`);
console.log(`ENCRYPTION_SALT=${salt}`);
console.log('\n⚠️  IMPORTANT: Keep these keys secure and never commit them to version control!');
console.log('⚠️  Store them in a secure key management service in production.');
