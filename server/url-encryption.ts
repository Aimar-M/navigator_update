import crypto from 'crypto';

/**
 * URL Encryption Utility
 * 
 * Encrypts/decrypts numeric IDs in URLs to prevent:
 * - ID enumeration attacks
 * - Information disclosure
 * - Unauthorized access attempts
 * 
 * Uses AES-256-GCM encryption with a secret key from environment variables.
 */

const ENCRYPTION_KEY = process.env.URL_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes for AES
const AUTH_TAG_LENGTH = 16; // 16 bytes for GCM

/**
 * Ensures we have a valid 32-byte key
 */
function getKey(): Buffer {
  let key = ENCRYPTION_KEY;
  
  // If key is hex string, convert to buffer
  if (key.length === 64) {
    try {
      return Buffer.from(key, 'hex');
    } catch {
      // Fall through to hash
    }
  }
  
  // Hash the key to get exactly 32 bytes
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypts a numeric ID to a URL-safe string
 * @param id - The numeric ID to encrypt
 * @returns Base64-encoded encrypted string (URL-safe)
 */
export function encryptId(id: number): string {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('Invalid ID: must be a positive integer');
  }

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  // Encrypt the ID as a string
  const encrypted = Buffer.concat([
    cipher.update(id.toString(), 'utf8'),
    cipher.final()
  ]);
  
  const authTag = cipher.getAuthTag();
  
  // Combine IV + AuthTag + Encrypted data
  const combined = Buffer.concat([
    iv,
    authTag,
    encrypted
  ]);
  
  // Return base64 URL-safe encoding
  return combined.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Decrypts a URL-encoded string back to a numeric ID
 * @param encrypted - The encrypted string from the URL
 * @returns The original numeric ID
 * @throws Error if decryption fails or ID is invalid
 */
export function decryptId(encrypted: string): number {
  try {
    // Restore base64 padding if needed
    let base64 = encrypted.replace(/-/g, '+').replace(/_/g, '/');
    const padding = base64.length % 4;
    if (padding) {
      base64 += '='.repeat(4 - padding);
    }
    
    const combined = Buffer.from(base64, 'base64');
    
    // Extract components
    const iv = combined.slice(0, IV_LENGTH);
    const authTag = combined.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encryptedData = combined.slice(IV_LENGTH + AUTH_TAG_LENGTH);
    
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt
    const decrypted = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final()
    ]);
    
    const id = parseInt(decrypted.toString('utf8'), 10);
    
    // Validate the decrypted ID
    if (!Number.isInteger(id) || id <= 0 || isNaN(id)) {
      throw new Error('Invalid decrypted ID');
    }
    
    return id;
  } catch (error) {
    throw new Error(`Failed to decrypt ID: ${error instanceof Error ? error.message : 'Invalid format'}`);
  }
}

/**
 * Validates and parses a numeric ID from URL parameter
 * Strict validation to prevent injection attacks
 * @param param - The URL parameter value
 * @returns Validated numeric ID
 * @throws Error if invalid
 */
export function validateId(param: string | undefined): number {
  if (!param || typeof param !== 'string') {
    throw new Error('ID parameter is required');
  }

  // Try to parse as integer
  const id = parseInt(param, 10);
  
  // Strict validation:
  // 1. Must be a valid integer
  // 2. Must be positive
  // 3. String representation must match exactly (prevents "123abc" → 123)
  if (
    isNaN(id) ||
    id <= 0 ||
    id.toString() !== param.trim() ||
    !Number.isInteger(id)
  ) {
    throw new Error(`Invalid ID format: ${param}`);
  }

  return id;
}

/**
 * Validates and optionally decrypts an ID from URL parameter
 * Supports both encrypted and plain numeric IDs for backward compatibility
 * @param param - The URL parameter value (encrypted or plain)
 * @param requireEncrypted - If true, only accepts encrypted IDs
 * @returns Validated numeric ID
 */
export function parseUrlId(param: string | undefined, requireEncrypted: boolean = false): number {
  if (!param || typeof param !== 'string') {
    throw new Error('ID parameter is required');
  }

  // Check if it looks like an encrypted ID (base64-like, longer than typical IDs)
  const looksEncrypted = param.length > 20 && /^[A-Za-z0-9_-]+$/.test(param);
  
  if (looksEncrypted || requireEncrypted) {
    try {
      return decryptId(param);
    } catch (error) {
      if (requireEncrypted) {
        throw new Error(`Invalid encrypted ID: ${error instanceof Error ? error.message : 'Decryption failed'}`);
      }
      // Fall through to try as plain ID
    }
  }

  // Try as plain numeric ID
  return validateId(param);
}

/**
 * Helper to check if a string is likely encrypted
 */
export function isEncryptedId(param: string): boolean {
  return param.length > 20 && /^[A-Za-z0-9_-]+$/.test(param);
}

