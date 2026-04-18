import type { components } from "./api/v1";

export type StaffUser = components["schemas"]["StaffLookupItem"];
export type StaffLookupResponse = components["schemas"]["BaseResponseOfListOfStaffLookupItem"];

export interface StaffManageItem {
  id: string;
  userName: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  isActive: boolean;
  profileImageUrl: string | null;
}

export interface UserManageItem {
  id: string;
  userName: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  isActive: boolean;
  profileImageUrl: string | null;
  deliveryRefusalCount: number;
  codBlockedUntil: string | null;
}
