import crypto from 'crypto';
import { ENCRYPTION_CONFIG } from '../config/config.js';
import { logger } from './logger.js';

/**
 * Encryption utility for sensitive data
 * Uses AES-256-GCM encryption algorithm
 */

// Get encryption key from config (loaded from .env file)
// In production, ALWAYS set ENCRYPTION_KEY environment variable (32 bytes hex string = 64 characters)
// If not set, generate a random key (warning: data encrypted with this key will not be recoverable after restart)
const ENCRYPTION_KEY = ENCRYPTION_CONFIG.KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM requires 12 bytes for IV
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Derive a key from the encryption key using PBKDF2
 */
function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha512');
}

/**
 * Encrypt sensitive data
 * @param {string} text - Plain text to encrypt
 * @returns {string|null} - Encrypted text in format: salt:iv:tag:encryptedData (base64 encoded)
 */
export function encrypt(text) {
  if (!text || text.trim() === '') {
    return null;
  }

  try {
    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Derive key from password and salt
    const key = deriveKey(ENCRYPTION_KEY, salt);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Get authentication tag
    const tag = cipher.getAuthTag();
    
    // Combine salt:iv:tag:encryptedData and encode
    const combined = Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, 'base64')
    ]);
    
    return combined.toString('base64');
  } catch (error) {
    logger.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 * @param {string} encryptedText - Encrypted text in format: salt:iv:tag:encryptedData (base64 encoded)
 * @returns {string|null} - Decrypted plain text
 */
export function decrypt(encryptedText) {
  if (!encryptedText || encryptedText.trim() === '') {
    return null;
  }

  // First check if it's valid base64
  let combined;
  try {
    combined = Buffer.from(encryptedText, 'base64');
  } catch (base64Error) {
    // Not valid base64 - definitely plain text
      logger.debug('Not valid base64, treating as plain text:', encryptedText.substring(0, 20) + '...');
    return encryptedText;
  }

  // Check if the buffer is large enough to contain salt + iv + tag
  // Encrypted data should be at least SALT_LENGTH + IV_LENGTH + TAG_LENGTH bytes
  const minEncryptedLength = SALT_LENGTH + IV_LENGTH + TAG_LENGTH;
  if (combined.length < minEncryptedLength) {
      // Too short to be our encrypted format
      // Check if it looks like base64 (contains only base64 chars and is reasonably long)
      // If it's a short base64 string, it might be encrypted with a different method
      // or corrupted. For now, treat as plain text but log a warning
      if (encryptedText.length > 20 && /^[A-Za-z0-9+/=]+$/.test(encryptedText)) {
        logger.warn('Data appears to be base64 but too short for our encryption format (' + combined.length + ' < ' + minEncryptedLength + '). This may be encrypted with a different method or corrupted.');
      }
      // Return as plain text - user will need to re-encrypt
      return encryptedText;
  }

  try {
    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    
    // Derive key from password and salt
    const key = deriveKey(ENCRYPTION_KEY, salt);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    // Decrypt
    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error('Decryption error:', error.message);
    logger.error('Encrypted text length:', encryptedText.length, 'Decoded buffer length:', combined.length);
    // Data structure looks correct but decryption failed
    // This could mean wrong encryption key or corrupted data
    logger.error('Failed to decrypt data - structure looks correct but decryption failed. Check encryption key.');
    // Return null to indicate decryption failure - don't return encrypted text
    return null;
  }
}

/**
 * Encrypt bank details object
 * @param {Object} bankDetails - Object with bank_name, bank_account_number, ifsc_code
 * @returns {Object} - Object with encrypted values
 */
export function encryptBankDetails(bankDetails) {
  if (!bankDetails) return null;
  
  const encrypted = {};
  if (bankDetails.bank_name) {
    encrypted.bank_name = encrypt(bankDetails.bank_name);
  }
  if (bankDetails.bank_account_number) {
    encrypted.bank_account_number = encrypt(bankDetails.bank_account_number);
  }
  if (bankDetails.ifsc_code) {
    encrypted.ifsc_code = encrypt(bankDetails.ifsc_code);
  }
  return encrypted;
}

/**
 * Decrypt bank details object
 * @param {Object} bankDetails - Object with encrypted bank_name, bank_account_number, ifsc_code
 * @returns {Object} - Object with decrypted values
 */
export function decryptBankDetails(bankDetails) {
  if (!bankDetails) return null;
  
  const decrypted = {};
  // Always attempt to decrypt if the field exists (even if it's an empty string)
  // This handles both encrypted and potentially unencrypted data
  if (bankDetails.bank_name !== null && bankDetails.bank_name !== undefined && bankDetails.bank_name !== '') {
    const decryptedValue = decrypt(bankDetails.bank_name);
    // Only set if decryption succeeded (not null and not the same as encrypted text)
    // If decrypt returns the same value, it means it was treated as plain text
    if (decryptedValue !== null && decryptedValue !== bankDetails.bank_name) {
      decrypted.bank_name = decryptedValue;
    } else if (decryptedValue === bankDetails.bank_name) {
      // Decrypt returned the same value - it's plain text, use it as-is
      decrypted.bank_name = decryptedValue;
    }
    // If decryptedValue is null, don't set it (decryption failed for encrypted data)
  }
  if (bankDetails.bank_account_number !== null && bankDetails.bank_account_number !== undefined && bankDetails.bank_account_number !== '') {
    const decryptedValue = decrypt(bankDetails.bank_account_number);
    if (decryptedValue !== null && decryptedValue !== bankDetails.bank_account_number) {
      decrypted.bank_account_number = decryptedValue;
    } else if (decryptedValue === bankDetails.bank_account_number) {
      decrypted.bank_account_number = decryptedValue;
    }
  }
  if (bankDetails.ifsc_code !== null && bankDetails.ifsc_code !== undefined && bankDetails.ifsc_code !== '') {
    const decryptedValue = decrypt(bankDetails.ifsc_code);
    if (decryptedValue !== null && decryptedValue !== bankDetails.ifsc_code) {
      decrypted.ifsc_code = decryptedValue;
    } else if (decryptedValue === bankDetails.ifsc_code) {
      decrypted.ifsc_code = decryptedValue;
    }
  }
  return decrypted;
}

/**
 * Encrypt document number
 * @param {string} documentNumber - Plain text document number
 * @returns {string|null} - Encrypted document number
 */
export function encryptDocumentNumber(documentNumber) {
  if (!documentNumber || documentNumber.trim() === '') {
    return null;
  }
  return encrypt(documentNumber);
}

/**
 * Decrypt document number
 * @param {string} encryptedDocumentNumber - Encrypted document number
 * @returns {string|null} - Decrypted document number
 */
export function decryptDocumentNumber(encryptedDocumentNumber) {
  if (!encryptedDocumentNumber || encryptedDocumentNumber.trim() === '') {
    return null;
  }
  return decrypt(encryptedDocumentNumber);
}
