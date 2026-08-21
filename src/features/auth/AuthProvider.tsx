import React, {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { authApi } from "../../api/authApi";
import { setAccessTokenProvider, setRefreshHandler } from "../../api/client";
import { LoginRequest, UserDto } from "../../api/types";
import { AuthContext, AuthStatus } from "./authContext";
import { authSession } from "./authSession";

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserDto | null>(null);
  const [status, setStatus] = useState<AuthStatus>("unauthenticated");
  const [, setSessionCheckCount] = useState(0);
  const checkSessionPromiseRef = useRef<Promise<void> | null>(null);

  const notifySessionChecked = useCallback(() => {
    authSession.markSessionChecked();
    setSessionCheckCount((c) => c + 1);
  }, []);

  useEffect(() => {
    setAccessTokenProvider(() => authSession.getAccessToken());
    setRefreshHandler(() => authSession.getOrStartRefresh());

    const unsubscribe = authSession.onAuthFailure(() => {
      setUser(null);
      setStatus("unauthenticated");
      setSessionCheckCount((c) => c + 1);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const checkSession = useCallback(async () => {
    if (!authSession.getAccessToken() && !authSession.getRefreshToken()) {
      authSession.clearSession();
      setUser(null);
      setStatus("unauthenticated");
      notifySessionChecked();
      return;
    }

    setStatus("checking");
    try {
      if (!authSession.getAccessToken()) {
        await authSession.getOrStartRefresh();
      }
      const me = await authApi.getMe();
      if (!me.is_active) {
        authSession.clearSession();
        setUser(null);
        setStatus("unauthenticated");
        notifySessionChecked();
        return;
      }
      setUser(me);
      setStatus("authenticated");
      notifySessionChecked();
    } catch {
      authSession.clearSession();
      setUser(null);
      setStatus("unauthenticated");
      notifySessionChecked();
    }
  }, [notifySessionChecked]);

  const ensureSessionChecked = useCallback(async () => {
    if (authSession.hasChecked()) {
      return;
    }
    if (checkSessionPromiseRef.current) {
      return checkSessionPromiseRef.current;
    }

    checkSessionPromiseRef.current = checkSession().finally(() => {
      checkSessionPromiseRef.current = null;
    });

    return checkSessionPromiseRef.current;
  }, [checkSession]);

  const login = useCallback(
    async (credentials: LoginRequest) => {
      const tokens = await authApi.login(credentials);
      authSession.setTokens(tokens.access_token, tokens.refresh_token);

      let loggedInUser = tokens.user;
      if (!loggedInUser) {
        loggedInUser = await authApi.getMe();
      }

      if (!loggedInUser.is_active) {
        authSession.clearSession();
        setUser(null);
        setStatus("unauthenticated");
        notifySessionChecked();
        throw new Error("Account is inactive");
      }

      setUser(loggedInUser);
      setStatus("authenticated");
      notifySessionChecked();
    },
    [notifySessionChecked],
  );

  const logout = useCallback(async () => {
    const refreshToken = authSession.getRefreshToken();
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } finally {
      authSession.clearSession();
      setUser(null);
      setStatus("unauthenticated");
      notifySessionChecked();
    }
  }, [notifySessionChecked]);

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        login,
        logout,
        checkSession,
        ensureSessionChecked,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
