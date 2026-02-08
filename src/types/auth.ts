import type { components } from "@/types/api/v1";

export type UserRole = components["schemas"]["UserRole"];

export type LoginRequest = components["schemas"]["LoginRequest"];

export type LoginResponse = components["schemas"]["BaseResponseOfTokenResponse"];

export interface DecodedToken {
  sub: string;
  id: string;
  name?: string;
  email: string;
  role: UserRole;
  jti: string;
  iss: string;
  aud: string;
  exp?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
