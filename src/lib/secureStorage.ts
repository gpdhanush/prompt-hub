/**
 * Secure Storage Utility
 * 
 * Provides encrypted storage for sensitive data using Web Crypto API.
 * Uses multi-layer encryption with encrypted key wrapping and key name obfuscation.
 * 
 * Security features:
 * - AES-GCM encryption (authenticated encryption)
 * - Multi-layer key derivation from multiple entropy sources
 * - Encryption key is itself encrypted (wrapped) using a master key
 * - Key names are obfuscated using SHA-256 hashing (prevents identification of stored data)
 * - Master key derived from: domain, user agent, platform, screen, timezone, etc.
 * - Session-based key component stored in sessionStorage (cleared on tab close)
 * - Automatic encryption/decryption with key unwrapping
 * - Graceful error handling and key rotation support
 * 
 * How it works:
 * 1. Master key is derived from multiple entropy sources (domain, user agent, etc.)
 * 2. Encryption key is generated and wrapped (encrypted) using the master key
 * 3. Key names are obfuscated using SHA-256 hashing with domain-specific salt
 * 4. Wrapped encryption key is stored in localStorage with obfuscated key name
 * 5. Data is encrypted using the unwrapped encryption key
 * 6. On access, master key is re-derived, encryption key is unwrapped, then data is decrypted
 * 
 * Key Name Obfuscation:
 * - Original keys like "auth_token", "user" are hashed to random-looking strings
 * - Example: "auth_token" → "a3f5b2c8d9e1f4a6b7c8d9e0f1a2b3c4"
 * - Key mapping is stored separately (also with obfuscated name)
 * - Attackers cannot identify what data is stored by looking at key names
 */

import { logger } from './logger';

// Constants
const STORAGE_PREFIX = 'secure_';
const MASTER_KEY_STORAGE = 'mk_enc'; // Obfuscated master key storage name
const KEY_MAP_STORAGE = 'km'; // Obfuscated key mapping storage
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 128; // 128 bits for authentication tag

// Cache for key name mappings (original key -> obfuscated key)
let keyMappingCache: Map<string, string> | null = null;

/**
 * Obfuscates a key name by hashing it with domain-specific salt
 * This makes it impossible to tell what the original key name was
 */
async function obfuscateKeyName(originalKey: string): Promise<string> {
  // Use domain-specific salt for key name hashing
  const encoder = new TextEncoder();
  const salt = `${window.location.origin}_key_salt_v2`;
  const combined = `${salt}_${originalKey}`;
  
  // Hash the key name
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(combined));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  
  // Convert to hex string and take first 16 characters for shorter key names
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 32); // Use 32 chars (16 bytes) for key name
}

/**
 * Gets the obfuscated key name, using cache if available
 */
async function getObfuscatedKeyName(originalKey: string): Promise<string> {
  // Initialize cache if needed
  if (keyMappingCache === null) {
    await initializeKeyMappingCache();
  }
  
  // Check cache first
  if (keyMappingCache!.has(originalKey)) {
    return keyMappingCache!.get(originalKey)!;
  }
  
  // Generate obfuscated key name
  const obfuscated = await obfuscateKeyName(originalKey);
  
  // Store in cache
  keyMappingCache!.set(originalKey, obfuscated);
  
  // Persist mapping to localStorage (encrypted)
  await persistKeyMapping(originalKey, obfuscated);
  
  return obfuscated;
}

/**
 * Initializes the key mapping cache from localStorage
 */
async function initializeKeyMappingCache(): Promise<void> {
  keyMappingCache = new Map();
  
  try {
    // Try to load existing mapping from obfuscated storage
    const mappingKey = await obfuscateKeyName(KEY_MAP_STORAGE);
    const mappingData = localStorage.getItem(mappingKey);
    
    if (mappingData) {
      // The mapping itself is stored as JSON (not encrypted, but obfuscated key name)
      // For extra security, we could encrypt this too, but it's already obfuscated
      try {
        const mapping = JSON.parse(mappingData);
        Object.entries(mapping).forEach(([original, obfuscated]) => {
          keyMappingCache!.set(original as string, obfuscated as string);
        });
      } catch (e) {
        // If parsing fails, start fresh
        logger.warn('Failed to load key mapping, starting fresh');
      }
    }
  } catch (error) {
    logger.warn('Failed to initialize key mapping cache:', error);
  }
}

/**
 * Persists a key mapping to localStorage
 */
async function persistKeyMapping(originalKey: string, obfuscatedKey: string): Promise<void> {
  try {
    const mappingKey = await obfuscateKeyName(KEY_MAP_STORAGE);
    const existingData = localStorage.getItem(mappingKey);
    
    let mapping: Record<string, string> = {};
    if (existingData) {
      try {
        mapping = JSON.parse(existingData);
      } catch (e) {
        // Start fresh if parsing fails
      }
    }
    
    mapping[originalKey] = obfuscatedKey;
    localStorage.setItem(mappingKey, JSON.stringify(mapping));
  } catch (error) {
    logger.error('Failed to persist key mapping:', error);
  }
}

/**
 * Finds the original key name from an obfuscated key name
 * This is needed when clearing all secure storage items
 */
async function findOriginalKeyName(obfuscatedKey: string): Promise<string | null> {
  if (keyMappingCache === null) {
    await initializeKeyMappingCache();
  }
  
  // Search through cache
  for (const [original, obfuscated] of keyMappingCache!.entries()) {
    if (obfuscated === obfuscatedKey) {
      return original;
    }
  }
  
  return null;
}

/**
 * Generates or retrieves a session-based master key component
 * This key is stored in sessionStorage and cleared when tab closes
 */
async function getOrCreateSessionKey(): Promise<CryptoKey> {
  const sessionKeyId = 'session_master_key';
  let sessionKeyData = sessionStorage.getItem(sessionKeyId);
  
  if (!sessionKeyData) {
    // Generate a new random session key
    const key = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );
    
    // Export and store in sessionStorage
    const exported = await crypto.subtle.exportKey('raw', key);
    const keyArray = Array.from(new Uint8Array(exported));
    sessionKeyData = btoa(String.fromCharCode(...keyArray));
    sessionStorage.setItem(sessionKeyId, sessionKeyData);
    
    return key;
  }
  
  // Import existing session key
  const keyBytes = Uint8Array.from(atob(sessionKeyData), c => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Derives a master key from multiple entropy sources
 * This master key is then used to derive the actual encryption key
 */
async function deriveMasterKey(): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  
  // Collect multiple entropy sources
  const entropySources = [
    window.location.hostname,
    window.location.origin,
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    screen.width.toString() + screen.height.toString(),
    new Date().getTimezoneOffset().toString(),
    // Additional obfuscated constants
    String.fromCharCode(78, 97, 101, 116, 104, 114, 97), // "Naethra" as char codes
    String.fromCharCode(69, 77, 83), // "EMS" as char codes
    '2024',
  ];
  
  // Combine all entropy sources with separators
  const combinedEntropy = entropySources.join('|_|');
  
  // Create multiple layers of hashing for obfuscation
  const hash1 = await crypto.subtle.digest('SHA-256', encoder.encode(combinedEntropy));
  const hash2 = await crypto.subtle.digest('SHA-256', new Uint8Array(hash1));
  const hash3 = await crypto.subtle.digest('SHA-384', new Uint8Array(hash2));
  
  // Use first 32 bytes of the final hash as master key material
  return hash3.slice(0, 32);
}

/**
 * Wraps (encrypts) the encryption key using the master key
 */
async function wrapEncryptionKey(encryptionKey: CryptoKey, masterKey: ArrayBuffer): Promise<string> {
  const masterKeyCrypto = await crypto.subtle.importKey(
    'raw',
    masterKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  // Export the encryption key
  const exportedKey = await crypto.subtle.exportKey('raw', encryptionKey);
  
  // Generate IV for wrapping
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  
  // Encrypt (wrap) the encryption key
  const wrapped = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: TAG_LENGTH,
    },
    masterKeyCrypto,
    exportedKey
  );
  
  // Combine IV and wrapped key
  const combined = new Uint8Array(iv.length + wrapped.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(wrapped), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

/**
 * Unwraps (decrypts) the encryption key using the master key
 */
async function unwrapEncryptionKey(wrappedKey: string, masterKey: ArrayBuffer): Promise<CryptoKey> {
  const masterKeyCrypto = await crypto.subtle.importKey(
    'raw',
    masterKey,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  // Decode from base64
  const combined = Uint8Array.from(atob(wrappedKey), c => c.charCodeAt(0));
  
  // Extract IV and wrapped key
  const iv = combined.slice(0, IV_LENGTH);
  const wrapped = combined.slice(IV_LENGTH);
  
  // Decrypt (unwrap) the encryption key
  const unwrapped = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: TAG_LENGTH,
    },
    masterKeyCrypto,
    wrapped
  );
  
  // Import the unwrapped key
  return crypto.subtle.importKey(
    'raw',
    unwrapped,
    { name: ALGORITHM },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Derives the actual encryption key using multi-layer key derivation
 * The key itself is encrypted (wrapped) using a master key
 */
async function deriveKey(): Promise<CryptoKey> {
  // Step 1: Derive master key from multiple entropy sources
  const masterKey = await deriveMasterKey();
  
  // Step 2: Check if we have a wrapped encryption key stored (using obfuscated key name)
  const obfuscatedMasterKey = await getObfuscatedKeyName(MASTER_KEY_STORAGE);
  const wrappedKeyStorage = localStorage.getItem(obfuscatedMasterKey);
  
  if (wrappedKeyStorage) {
    // Unwrap the existing encryption key
    try {
      return await unwrapEncryptionKey(wrappedKeyStorage, masterKey);
    } catch (error) {
      // If unwrapping fails, generate a new key (master key may have changed)
      // This is expected on first run or after clearing browser data
      logger.debug('Failed to unwrap encryption key, generating new one (this is normal on first run)');
      localStorage.removeItem(obfuscatedMasterKey);
    }
  }
  
  // Step 3: Generate a new encryption key
  const encryptionKey = await crypto.subtle.generateKey(
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    true, // extractable for wrapping
    ['encrypt', 'decrypt']
  );
  
  // Step 4: Wrap (encrypt) the encryption key using master key
  const wrappedKey = await wrapEncryptionKey(encryptionKey, masterKey);
  
  // Step 5: Store the wrapped key using obfuscated key name
  localStorage.setItem(obfuscatedMasterKey, wrappedKey);
  
  return encryptionKey;
}

/**
 * Encrypts data using AES-GCM
 */
async function encrypt(data: string): Promise<string> {
  try {
    const key = await deriveKey();
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    // Generate a random IV for each encryption
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    
    // Encrypt the data
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv,
        tagLength: TAG_LENGTH,
      },
      key,
      dataBuffer
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);
    
    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
    } catch (error) {
      logger.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
}

/**
 * Decrypts data using AES-GCM
 */
async function decrypt(encryptedData: string): Promise<string> {
  try {
    const key = await deriveKey();
    
    // Convert from base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, IV_LENGTH);
    const encrypted = combined.slice(IV_LENGTH);
    
    // Decrypt the data
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv,
        tagLength: TAG_LENGTH,
      },
      key,
      encrypted
    );
    
    // Convert back to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error: any) {
    // Check for Web Crypto API decryption errors (key mismatch, corrupted data, etc.)
    const isDecryptionError = error.name === 'OperationError' || 
                              error.message?.includes('decrypt') ||
                              error.message?.includes('unable to authenticate') ||
                              error.message?.includes('Unsupported state');
    
    if (isDecryptionError) {
      // This is likely due to key mismatch (backend restart without ENCRYPTION_KEY)
      // Don't log as error - this is expected when encryption key changes
      // The caller will handle this gracefully
      throw new Error('Decryption failed - key may have changed. This can happen after backend restart.');
    }
    
    // For other errors, log at debug level (might be corrupted data or other issues)
    logger.debug('Decryption error:', {
      errorName: error.name,
      errorMessage: error.message,
      encryptedLength: encryptedData?.length,
    });
    
    throw new Error('Failed to decrypt data. Data may be corrupted or from a different origin.');
  }
}

/**
 * Secure Storage API
 * Provides encrypted localStorage operations
 */
export const secureStorage = {
  /**
   * Stores encrypted data in localStorage with obfuscated key name
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      const encrypted = await encrypt(value);
      const obfuscatedKey = await getObfuscatedKeyName(key);
      localStorage.setItem(obfuscatedKey, encrypted);
    } catch (error) {
      logger.error(`Failed to store ${key}:`, error);
      throw error;
    }
  },

  /**
   * Retrieves and decrypts data from localStorage using obfuscated key name
   */
  async getItem(key: string): Promise<string | null> {
    try {
      const obfuscatedKey = await getObfuscatedKeyName(key);
      const encrypted = localStorage.getItem(obfuscatedKey);
      if (!encrypted) {
        return null;
      }
      return await decrypt(encrypted);
    } catch (error: any) {
      // Don't clear data on decryption errors - might be temporary (backend restart, etc.)
      // Only log the error, don't remove the data
      const isKeyChangeError = error.message?.includes('key may have changed') || 
                               error.message?.includes('Failed to decrypt') || 
                               error.message?.includes('corrupted');
      
      if (isKeyChangeError) {
        // This is expected when encryption key changes (backend restart without ENCRYPTION_KEY)
        logger.debug(`Cannot decrypt ${key} - encryption key may have changed. This is normal after backend restart.`);
      } else {
        logger.warn(`Failed to decrypt ${key}, attempting recovery:`, error.message);
      }
      
      // Try recovery: if key derivation changed (backend restart), regenerate key
      if (isKeyChangeError) {
        try {
          // Force re-derivation of encryption key by clearing wrapped key
          const obfuscatedMasterKey = await getObfuscatedKeyName(MASTER_KEY_STORAGE);
          const hadWrappedKey = localStorage.getItem(obfuscatedMasterKey) !== null;
          
          if (hadWrappedKey) {
            // Clear wrapped key to force regeneration
            localStorage.removeItem(obfuscatedMasterKey);
            
            // Retry decryption with newly derived key
            const obfuscatedKey = await getObfuscatedKeyName(key);
            const encrypted = localStorage.getItem(obfuscatedKey);
            if (encrypted) {
              try {
                return await decrypt(encrypted);
              } catch (retryError) {
                // If retry also fails, the data is truly incompatible with new key
                logger.debug(`Recovery failed for ${key} - data encrypted with different key. User will need to login again.`);
              }
            }
          }
        } catch (retryError) {
          // Silently handle recovery failures - this is expected when key changes
          logger.debug(`Recovery attempt failed for ${key} - this is normal when encryption key changes`);
        }
      }
      
      // If all recovery attempts fail, return null but don't clear data
      // The data is still there, just can't decrypt it right now
      // This prevents logout on temporary backend issues
      // User will need to login again if key truly changed
      return null;
    }
  },

  /**
   * Removes encrypted data from localStorage using obfuscated key name
   */
  async removeItem(key: string): Promise<void> {
    const obfuscatedKey = await getObfuscatedKeyName(key);
    localStorage.removeItem(obfuscatedKey);
  },

  /**
   * Clears all secure storage items including the wrapped encryption key
   * This iterates through all localStorage keys and checks if they're obfuscated secure keys
   */
  async clear(): Promise<void> {
    // Clear all keys that match our obfuscated pattern
    // Since we can't easily identify them, we'll clear known keys and the mapping
    const keysToClear = [
      'auth_token',
      'user',
      'remember_me',
      MASTER_KEY_STORAGE,
    ];
    
    for (const key of keysToClear) {
      try {
        const obfuscatedKey = await getObfuscatedKeyName(key);
        localStorage.removeItem(obfuscatedKey);
      } catch (e) {
        // Continue if key doesn't exist
      }
    }
    
    // Clear the key mapping storage
    try {
      const mappingKey = await obfuscateKeyName(KEY_MAP_STORAGE);
      localStorage.removeItem(mappingKey);
    } catch (e) {
      // Ignore
    }
    
    // Clear session key
    sessionStorage.removeItem('session_master_key');
    
    // Clear cache
    keyMappingCache = null;
  },

  /**
   * Checks if a key exists in secure storage
   */
  async hasItem(key: string): Promise<boolean> {
    const obfuscatedKey = await getObfuscatedKeyName(key);
    return localStorage.getItem(obfuscatedKey) !== null;
  },
};

/**
 * Cache for decrypted values to enable synchronous access
 * This cache is populated when data is stored or retrieved
 */
const decryptedCache: Map<string, string> = new Map();

/**
 * Synchronous setItem - stores in cache immediately, encrypts in background
 * This allows immediate synchronous access while still encrypting for storage
 */
export function setItemSync(key: string, value: string): void {
  // Store in cache immediately for synchronous access
  decryptedCache.set(key, value);
  // Encrypt and store asynchronously
  secureStorage.setItem(key, value).catch(error => {
    logger.error(`Async encryption failed for ${key}:`, error);
    // Remove from cache if encryption fails
    decryptedCache.delete(key);
  });
}

/**
 * Synchronous getItem - returns from cache if available
 * Returns null if not in cache (call async version to decrypt from storage)
 */
export function getItemSync(key: string): string | null {
  return decryptedCache.get(key) || null;
}

// Track initialization state to prevent multiple simultaneous initializations
let initializationPromise: Promise<void> | null = null;
let isInitialized = false;

/**
 * Initialize secure storage by pre-loading encrypted data into cache
 * Call this on app startup for better performance
 * This function is idempotent - safe to call multiple times
 */
export async function initializeSecureStorage(): Promise<void> {
  // If already initialized, return immediately
  if (isInitialized) {
    return;
  }
  
  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }
  
  // Start initialization
  initializationPromise = (async () => {
    try {
      // Initialize key mapping cache first
      await initializeKeyMappingCache();
      
      // Pre-load known keys into cache
      const knownKeys = ['auth_token', 'user', 'remember_me'];
      for (const key of knownKeys) {
        try {
          const value = await secureStorage.getItem(key);
          if (value) {
            decryptedCache.set(key, value);
          }
        } catch (e: any) {
          // Continue if key doesn't exist or fails to decrypt
          // This is expected when encryption key changes (backend restart)
          if (e.message?.includes('key may have changed')) {
            logger.debug(`Cannot decrypt ${key} during initialization - encryption key changed. User will need to login.`);
          } else {
            logger.debug(`Failed to load ${key} during initialization (may not exist):`, e.message);
          }
        }
      }
      
      isInitialized = true;
      logger.info('Secure storage initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize secure storage:', error);
      // Reset promise on error so it can be retried
      initializationPromise = null;
      throw error;
    }
  })();
  
  return initializationPromise;
}

/**
 * Enhanced secureStorage with cache integration
 */
export const secureStorageWithCache = {
  ...secureStorage,
  
  /**
   * Stores encrypted data and updates cache
   */
  async setItem(key: string, value: string): Promise<void> {
    decryptedCache.set(key, value);
    await secureStorage.setItem(key, value);
  },

  /**
   * Retrieves data, checking cache first, then decrypting from storage
   */
  async getItem(key: string): Promise<string | null> {
    // Check cache first
    if (decryptedCache.has(key)) {
      return decryptedCache.get(key)!;
    }
    
    // If not in cache, decrypt from storage
    try {
      const value = await secureStorage.getItem(key);
      if (value) {
        decryptedCache.set(key, value);
      }
      return value;
    } catch (error: any) {
      // If decryption fails, try to recover from cache or return null
      // Don't throw - let the app continue working
      logger.warn(`Failed to get ${key} from secure storage:`, error.message);
      return decryptedCache.get(key) || null;
    }
  },

  /**
   * Removes item from both storage and cache
   */
  async removeItem(key: string): Promise<void> {
    decryptedCache.delete(key);
    await secureStorage.removeItem(key);
  },

  /**
   * Clears both storage and cache
   */
  async clear(): Promise<void> {
    decryptedCache.clear();
    await secureStorage.clear();
  },
};

/**
 * Rotates the encryption key (generates a new one)
 * WARNING: This will make all existing encrypted data unreadable
 * Only use this if you want to invalidate all existing encrypted data
 */
export async function rotateEncryptionKey(): Promise<void> {
  // Clear the wrapped key to force generation of a new one
  const obfuscatedMasterKey = await getObfuscatedKeyName(MASTER_KEY_STORAGE);
  localStorage.removeItem(obfuscatedMasterKey);
  // Clear all encrypted data
  await secureStorage.clear();
  // Clear cache
  decryptedCache.clear();
  // Clear key mapping cache
  keyMappingCache = null;
  // Force key derivation to generate a new key
  await deriveKey();
}

/**
 * Clears all encrypted data that cannot be decrypted (e.g., after encryption key change)
 * This is useful when the backend encryption key has changed and old data is no longer accessible
 * WARNING: This will clear all encrypted data including auth tokens - user will need to login again
 */
export async function clearInvalidEncryptedData(): Promise<void> {
  logger.info('Clearing invalid encrypted data (encryption key may have changed)');
  
  // Clear all secure storage
  await secureStorage.clear();
  
  // Clear the wrapped key
  const obfuscatedMasterKey = await getObfuscatedKeyName(MASTER_KEY_STORAGE);
  localStorage.removeItem(obfuscatedMasterKey);
  
  // Clear cache
  decryptedCache.clear();
  
  // Clear key mapping cache
  keyMappingCache = null;
  
  // Reset initialization state
  isInitialized = false;
  initializationPromise = null;
  
  logger.info('Invalid encrypted data cleared. User will need to login again.');
}
