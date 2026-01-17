// Encryption utilities for secure credential storage
import crypto from 'crypto';
import config from '../config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypt sensitive data (like router passwords)
 */
export function encrypt(text: string): string {
    const key = Buffer.from(config.encryptionKey, 'hex');
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return IV + AuthTag + EncryptedData
    return iv.toString('hex') + authTag.toString('hex') + encrypted;
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedData: string): string {
    const key = Buffer.from(config.encryptionKey, 'hex');

    // Extract IV, AuthTag, and encrypted text
    const iv = Buffer.from(encryptedData.slice(0, IV_LENGTH * 2), 'hex');
    const authTag = Buffer.from(encryptedData.slice(IV_LENGTH * 2, (IV_LENGTH + AUTH_TAG_LENGTH) * 2), 'hex');
    const encrypted = encryptedData.slice((IV_LENGTH + AUTH_TAG_LENGTH) * 2);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Generate a secure encryption key (run once during setup)
 */
export function generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
}
