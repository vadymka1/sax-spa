import { createContext } from "react";
import { UserDto, LoginRequest } from "../../api/types";

export type AuthStatus = "checking" | "authenticated" | "unauthenticated";

export interface AuthContextValue {
  user: UserDto | null;
  status: AuthStatus;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  ensureSessionChecked: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
