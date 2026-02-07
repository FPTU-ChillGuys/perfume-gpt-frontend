import type { paths, components } from "@/types/api/v1";

export type UserRole = "admin" | "staff" | "user";

export type LoginRequest = components["schemas"]["LoginRequest"];

export type LoginResponse = paths["/api/auths/login"]["post"]["responses"]["200"]["content"]["application/json"];

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
