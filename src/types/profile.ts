import type { components } from "@/types/api/v1";

export type UpdateProfileRequest = components["schemas"]["UpdateProfileRequest"];

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phoneNumber?: string;
  scentPreference?: string;
  minBudget?: number;
  maxBudget?: number;
  preferredStyle?: string;
  favoriteNotes?: string;
  profilePictureUrl?: string;
  createdAt?: string;
}

export interface ProfileResponse {
  success: boolean;
  message?: string;
  payload?: UserProfile;
}
