/**
 * Guest User ID utilities
 * Manages a consistent guestUserId across all pages/components
 * Stored in localStorage with key "guestUserId"
 */

import { v4 as uuid } from "uuid";

const GUEST_USER_ID_KEY = "guestUserId";

/**
 * Get or create a consistent guestUserId
 * Returns the same ID for the same browser/device
 */
export function getOrCreateGuestUserId(): string {
  try {
    let guestUserId = localStorage.getItem(GUEST_USER_ID_KEY);
    if (!guestUserId) {
      guestUserId = uuid();
      localStorage.setItem(GUEST_USER_ID_KEY, guestUserId);
    }
    return guestUserId;
  } catch (e) {
    // Fallback if localStorage is not available (e.g., private mode)
    console.warn("localStorage not available, generating temporary guest ID");
    return uuid();
  }
}

/**
 * Clear the stored guestUserId (useful for logout/reset)
 */
export function clearGuestUserId(): void {
  try {
    localStorage.removeItem(GUEST_USER_ID_KEY);
  } catch (e) {
    console.warn("Failed to clear guest user ID");
  }
}
