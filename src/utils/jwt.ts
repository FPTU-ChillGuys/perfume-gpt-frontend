import { jwtDecode } from "jwt-decode";
import type { DecodedToken, User } from "../types/auth";

export const decodeToken = (token: string): DecodedToken | null => {
  try {
    const decoded = jwtDecode<DecodedToken>(token);
    return decoded;
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
};

export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = decodeToken(token);

    if (!decoded) {
      return true;
    }

    // If token doesn't have exp field, treat it as never expiring
    if (!decoded.exp) {
      return false;
    }

    // Get current time in seconds
    const currentTime = Math.floor(Date.now() / 1000);

    // Check if exp is in milliseconds (if it's a very large number)
    const expTime =
      decoded.exp > 9999999999
        ? Math.floor(decoded.exp / 1000) // Convert milliseconds to seconds
        : decoded.exp; // Already in seconds

    // Token is expired if expTime is less than current time
    return expTime <= currentTime;
  } catch (error) {
    return true;
  }
};

export const getUserFromToken = (token: string): User | null => {
  const decoded = decodeToken(token);
  if (!decoded) return null;

  return {
    id: decoded.id,
    name: decoded.name || decoded.email,
    email: decoded.email,
    role: decoded.role,
    avatarUrl: decoded.avatarUrl || decoded.avatar || decoded.picture,
  };
};
