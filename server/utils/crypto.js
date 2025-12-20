import crypto from 'crypto';
import { logger } from './logger.js';

/**
 * AES-256-GCM Encryption/Decryption Utility
 * Used for encrypting sensitive data at rest (comments, call summaries, release notes)
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes for GCM
const SALT_LENGTH = 64; // 64 bytes for key derivation
const TAG_LENGTH = 16; // 16 bytes for authentication tag
const KEY_LENGTH = 32; // 32 bytes for AES-256

/**
 * Get encryption key from environment variable
 * @returns {Buffer} Encryption key
 */
function getEncryptionKey() {
  const key = process.env.DATA_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('DATA_ENCRYPTION_KEY environment variable is not set');
  }
  
  // If key is hex string, convert to buffer
  if (key.length === 64) {
    return Buffer.from(key, 'hex');
  }
  
  // Otherwise, derive key from string using PBKDF2
  return crypto.pbkdf2Sync(key, 'salt', 100000, KEY_LENGTH, 'sha256');
}

/**
 * Get IV from environment variable or generate random
 * @returns {Buffer} Initialization vector
 */
function getIV() {
  const iv = process.env.DATA_ENCRYPTION_IV;
  if (iv && iv.length === 32) {
    // Use provided IV (hex string, 32 chars = 16 bytes)
    return Buffer.from(iv, 'hex');
  }
  
  // Generate random IV
  return crypto.randomBytes(IV_LENGTH);
}

/**
 * Encrypt text using AES-256-GCM
 * @param {string} text - Plain text to encrypt
 * @returns {string} Encrypted text (hex format: iv:tag:ciphertext)
 */
export function encrypt(text) {
  try {
    if (!text || text.trim() === '') {
      return text; // Return empty string as-is
    }
    
    const key = getEncryptionKey();
    const iv = getIV();
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Format: iv:tag:ciphertext (all in hex)
    const result = `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
    
    return result;
  } catch (error) {
    logger.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt text using AES-256-GCM
 * @param {string} encryptedText - Encrypted text (format: iv:tag:ciphertext)
 * @returns {string} Decrypted plain text
 */
export function decrypt(encryptedText) {
  try {
    if (!encryptedText || encryptedText.trim() === '') {
      return encryptedText; // Return empty string as-is
    }
    
    // Check if text is already decrypted (doesn't contain colons)
    if (!encryptedText.includes(':')) {
      // Assume it's plain text (for backward compatibility)
      return encryptedText;
    }
    
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      // Invalid format, return as-is (might be plain text)
      logger.warn('Invalid encrypted text format, returning as-is');
      return encryptedText;
    }
    
    const [ivHex, tagHex, ciphertext] = parts;
    
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error('Decryption error:', error);
    // If decryption fails, return original text (might be plain text from old records)
    logger.warn('Decryption failed, returning original text');
    return encryptedText;
  }
}

/**
 * Check if text is encrypted
 * @param {string} text - Text to check
 * @returns {boolean} True if encrypted
 */
export function isEncrypted(text) {
  if (!text || !text.includes(':')) {
    return false;
  }
  
  const parts = text.split(':');
  return parts.length === 3 && parts[0].length === 32 && parts[1].length === 32;
}

