import type { components } from "@/types/api/v1";

export type UpdateProfileRequest = components["schemas"]["UpdateProfileRequest"];
export type ProfileResponse = components["schemas"]["ProfileResponse"];
export type CustomerNotePreference =
  components["schemas"]["CustomerNotePreferenceResponse"];
export type CustomerFamilyPreference =
  components["schemas"]["CustomerFamilyPreferenceRespone"];
export type CustomerAttributePreference =
  components["schemas"]["CustomerAttributePreferenceResponse"];

export interface UserProfile {
  dateOfBirth?: string | null;
  minBudget?: number | null;
  maxBudget?: number | null;
  notePreferences: CustomerNotePreference[];
  familyPreferences: CustomerFamilyPreference[];
  attributePreferences: CustomerAttributePreference[];
}
