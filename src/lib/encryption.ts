import * as Crypto from 'expo-crypto';

// Generate a random encryption key for each chat
export async function generateEncryptionKey(): Promise<string> {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Simple XOR encryption for demo purposes
// In production, use proper encryption libraries like react-native-crypto
export function encryptMessage(message: string, key: string): string {
  try {
    let encrypted = '';
    for (let i = 0; i < message.length; i++) {
      const messageChar = message.charCodeAt(i);
      const keyChar = key.charCodeAt(i % key.length);
      encrypted += String.fromCharCode(messageChar ^ keyChar);
    }
    return btoa(encrypted); // Base64 encode
  } catch (error) {
    console.error('Encryption failed:', error);
    return message; // Fallback to plain text
  }
}

// Simple XOR decryption
export function decryptMessage(encryptedMessage: string, key: string): string {
  try {
    const encrypted = atob(encryptedMessage); // Base64 decode
    let decrypted = '';
    for (let i = 0; i < encrypted.length; i++) {
      const encryptedChar = encrypted.charCodeAt(i);
      const keyChar = key.charCodeAt(i % key.length);
      decrypted += String.fromCharCode(encryptedChar ^ keyChar);
    }
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return encryptedMessage; // Fallback to encrypted text
  }
}

// Hash function for secure key derivation
export async function deriveKey(input: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    input,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
  return digest;
}