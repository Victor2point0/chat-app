import CryptoJS from 'crypto-js';

// Generate a random encryption key for each chat
export function generateEncryptionKey(): string {
  return CryptoJS.lib.WordArray.random(256/8).toString();
}

// Encrypt message content
export function encryptMessage(message: string, key: string): string {
  try {
    return CryptoJS.AES.encrypt(message, key).toString();
  } catch (error) {
    console.error('Encryption failed:', error);
    return message; // Fallback to plain text
  }
}

// Decrypt message content
export function decryptMessage(encryptedMessage: string, key: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedMessage, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || encryptedMessage; // Fallback if decryption fails
  } catch (error) {
    console.error('Decryption failed:', error);
    return encryptedMessage; // Fallback to encrypted text
  }
}

// Hash function for secure key derivation
export function deriveKey(input: string): string {
  return CryptoJS.SHA256(input).toString();
}