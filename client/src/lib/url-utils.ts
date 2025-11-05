/**
 * Client-side URL utilities for encrypted IDs
 * 
 * Provides functions to encrypt/decrypt IDs for URLs on the client side.
 * Note: For production, you may want to handle encryption server-side only.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Encrypts an ID for use in URLs
 * For now, this just returns the ID as-is.
 * In production, you might want to:
 * 1. Call an API endpoint to get encrypted ID
 * 2. Or use the same encryption logic (but keep key server-side only)
 * 
 * @param id - The numeric ID to encrypt
 * @returns Encrypted ID string (or plain ID if encryption not configured)
 */
export function encryptId(id: number): string {
  // For security, encryption should happen server-side
  // This is a placeholder that can be enhanced
  return id.toString();
}

/**
 * Decrypts an ID from a URL
 * @param encrypted - The encrypted ID string
 * @returns The numeric ID
 */
export function decryptId(encrypted: string): number {
  // For now, just parse as integer
  // In production, implement client-side decryption or call API
  const id = parseInt(encrypted, 10);
  if (isNaN(id) || id <= 0) {
    throw new Error('Invalid ID format');
  }
  return id;
}

/**
 * Builds a trip URL (with optional encryption)
 * @param tripId - The trip ID
 * @param encrypted - Whether to use encrypted ID (default: false for now)
 * @returns The trip URL
 */
export function tripUrl(tripId: number, encrypted: boolean = false): string {
  const id = encrypted ? encryptId(tripId) : tripId.toString();
  return `/trips/${id}`;
}

/**
 * Builds an activity URL
 * @param activityId - The activity ID
 * @param tripId - Optional trip ID for nested route
 * @param encrypted - Whether to use encrypted IDs
 * @returns The activity URL
 */
export function activityUrl(
  activityId: number,
  tripId?: number,
  encrypted: boolean = false
): string {
  const actId = encrypted ? encryptId(activityId) : activityId.toString();
  
  if (tripId) {
    const tId = encrypted ? encryptId(tripId) : tripId.toString();
    return `/trips/${tId}/activities/${actId}`;
  }
  
  return `/activities/${actId}`;
}

/**
 * Builds an expense URL
 * @param expenseId - The expense ID
 * @param tripId - The trip ID
 * @param encrypted - Whether to use encrypted IDs
 * @returns The expense URL
 */
export function expenseUrl(
  expenseId: number,
  tripId: number,
  encrypted: boolean = false
): string {
  const expId = encrypted ? encryptId(expenseId) : expenseId.toString();
  const tId = encrypted ? encryptId(tripId) : tripId.toString();
  return `/trips/${tId}/expenses/${expId}`;
}

/**
 * Builds an invitation URL
 * @param token - The invitation token
 * @returns The invitation URL
 */
export function inviteUrl(token: string): string {
  return `/invite/${token}`;
}

/**
 * Builds a user profile URL
 * @param userId - The user ID
 * @param encrypted - Whether to use encrypted ID
 * @returns The user profile URL
 */
export function userProfileUrl(userId: number, encrypted: boolean = false): string {
  const id = encrypted ? encryptId(userId) : userId.toString();
  return `/user/${id}`;
}

/**
 * Parses and validates an ID from URL parameters
 * @param param - The URL parameter value
 * @returns Validated numeric ID
 * @throws Error if invalid
 */
export function parseIdFromUrl(param: string | undefined): number {
  if (!param) {
    throw new Error('ID parameter is required');
  }

  const id = parseInt(param, 10);
  
  if (isNaN(id) || id <= 0 || id.toString() !== param.trim()) {
    throw new Error(`Invalid ID format: ${param}`);
  }
  
  return id;
}

