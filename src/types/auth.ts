export type UserRole = "admin" | "staff" | "user";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  payload: {
    accessToken: string;
  };
  success: boolean;
  message: string;
  errors: any;
  errorType: string;
}

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
