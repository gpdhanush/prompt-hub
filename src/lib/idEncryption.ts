/**
 * Simple encryption/decryption for employee IDs in URLs
 * Uses a simple cipher with base64url encoding for URL safety
 */

const ENCRYPTION_KEY = 'employee-id-encryption-key-2024'; // In production, use env variable

/**
 * Encrypt employee ID for URL
 * @param id - Employee ID to encrypt
 * @returns Encrypted string (URL-safe)
 */
export function encryptEmployeeId(id: number | string): string {
  if (!id) return '';
  
  const idStr = String(id);
  const key = ENCRYPTION_KEY;
  
  // Simple XOR cipher with key rotation
  let encrypted = '';
  for (let i = 0; i < idStr.length; i++) {
    const charCode = idStr.charCodeAt(i);
    const keyChar = key.charCodeAt(i % key.length);
    encrypted += String.fromCharCode(charCode ^ keyChar);
  }
  
  // Convert to base64url (URL-safe base64)
  const base64 = btoa(encrypted);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Decrypt employee ID from URL
 * @param encrypted - Encrypted string from URL
 * @returns Decrypted employee ID as number, or null if invalid
 */
export function decryptEmployeeId(encrypted: string): number | null {
  if (!encrypted || encrypted.trim() === '') return null;
  
  try {
    // Convert from base64url to base64
    let base64 = encrypted.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }
    
    // Decode base64
    const decrypted = atob(base64);
    const key = ENCRYPTION_KEY;
    
    // Reverse XOR cipher
    let idStr = '';
    for (let i = 0; i < decrypted.length; i++) {
      const charCode = decrypted.charCodeAt(i);
      const keyChar = key.charCodeAt(i % key.length);
      idStr += String.fromCharCode(charCode ^ keyChar);
    }
    
    const id = parseInt(idStr, 10);
    return isNaN(id) ? null : id;
  } catch (error) {
    console.error('Error decrypting employee ID:', error);
    return null;
  }
}
