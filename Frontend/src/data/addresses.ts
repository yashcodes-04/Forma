import type { User } from "../auth/AuthContext";

export type SavedAddress = {
  id: string;
  userId?: string;
  userMobile?: string;
  name: string;
  mobile: string;
  address: string;
  city: string;
  pin: string;
};

const GLOBAL_ADDRESSES_KEY = "formaAddresses";

function getUserAddressKey(user: User | null): string {
  if (!user) return `${GLOBAL_ADDRESSES_KEY}_guest`;
  // Use a unique sanitized user key
  const safeId = user.id ? user.id.replace(/[^a-zA-Z0-9_-]/g, "_") : "user";
  const cleanMobile = (user.mobile || "").replace(/\D/g, "");
  return `${GLOBAL_ADDRESSES_KEY}_${safeId}_${cleanMobile.slice(-10)}`;
}

/**
 * Load saved addresses strictly for the authenticated user
 */
export function loadUserAddresses(user: User | null): SavedAddress[] {
  if (!user) {
    return [];
  }

  try {
    const key = getUserAddressKey(user);
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored) as SavedAddress[];
    }

    // Check if there are legacy addresses that explicitly match this user's mobile or ID
    const legacy = JSON.parse(localStorage.getItem(GLOBAL_ADDRESSES_KEY) ?? "[]") as SavedAddress[];
    const cleanMobile = (user.mobile || "").replace(/\D/g, "");
    const matched = legacy.filter((addr) => {
      if (addr.userId && addr.userId === user.id) return true;
      if (cleanMobile && addr.mobile) {
        const addrMobile = addr.mobile.replace(/\D/g, "");
        return addrMobile.length >= 10 && cleanMobile.endsWith(addrMobile.slice(-10));
      }
      return false;
    });

    if (matched.length > 0) {
      // Migrate to user scoped key
      localStorage.setItem(key, JSON.stringify(matched));
      return matched;
    }

    return [];
  } catch {
    return [];
  }
}

/**
 * Save addresses strictly for the specified user
 */
export function saveUserAddresses(addresses: SavedAddress[], user: User | null) {
  if (!user) return;
  const key = getUserAddressKey(user);
  // Ensure every address item is stamped with the user's ID and mobile
  const enriched = addresses.map((addr) => ({
    ...addr,
    userId: user.id,
    userMobile: user.mobile,
  }));
  localStorage.setItem(key, JSON.stringify(enriched));
}

/**
 * Backwards compatible helper
 */
export function loadAddresses(user?: User | null): SavedAddress[] {
  return loadUserAddresses(user || null);
}

export function saveAddresses(addresses: SavedAddress[], user?: User | null) {
  saveUserAddresses(addresses, user || null);
}

