/**
 * User utility functions
 * Helper functions for working with user data
 */

interface User {
  id: number;
  name?: string | null;
  username?: string | null;
  deletedAt?: string | null;
}

/**
 * Get display name for a user
 * Returns "User not found" if the user is deleted, otherwise returns their name or username
 */
export function getDisplayName(user: User | null | undefined): string {
  if (!user) return "User not found";
  if (user.deletedAt) return "User not found";
  return user.name || user.username || "Unknown User";
}

/**
 * Check if a user is deleted
 */
export function isUserDeleted(user: User | null | undefined): boolean {
  return !!user?.deletedAt;
}

