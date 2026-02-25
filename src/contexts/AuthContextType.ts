import { createContext } from "react";
import type { User, LoginRequest } from "../types/auth";

// Auth context type definition - login/googleLogin return User for redirect
export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<User>;
  googleLogin: (idToken: string) => Promise<User>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);
