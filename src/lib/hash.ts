'use server';

import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

// Convert scrypt to promise-based
const scryptAsync = promisify(scrypt);

// Constants for hashing
const SALT_LENGTH = 32;
const KEY_LENGTH = 64;
const SEPARATOR = '$';

/**
 * Hash a password using scrypt
 * Returns format: salt$hash
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    // Generate a random salt
    const salt = randomBytes(SALT_LENGTH);

    // Hash the password
    const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;

    // Combine salt and hash with a separator
    return `${salt.toString('base64')}${SEPARATOR}${derivedKey.toString('base64')}`;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error hashing password:', error);
    throw new Error('Password hashing failed');
  }
}

/**
 * Verify a password against a hash
 * @param hashedPassword - The stored password hash
 * @param plainPassword - The password to verify
 * @returns Promise<boolean> - True if password matches
 */
export async function verifyPassword(hashedPassword: string, plainPassword: string): Promise<boolean> {
  try {
    if (!hashedPassword || !plainPassword) {
      throw new Error('Both hash and password are required');
    }

    // Split stored string into salt and hash
    const [salt, hash] = hashedPassword.split(SEPARATOR);

    if (!salt || !hash) {
      throw new Error('Invalid hash format');
    }

    // Convert base64 salt back to buffer
    const saltBuffer = Buffer.from(salt, 'base64');

    // Hash the input password with the stored salt
    const derivedKey = (await scryptAsync(plainPassword, saltBuffer, KEY_LENGTH)) as Buffer;

    // Convert stored hash to buffer for comparison
    const hashBuffer = Buffer.from(hash, 'base64');

    // Compare hashes using timing-safe equality
    return timingSafeEqual(derivedKey, hashBuffer);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error verifyPassword password:', error);
    throw new Error('Password verifyPassword failed');
  }
}
