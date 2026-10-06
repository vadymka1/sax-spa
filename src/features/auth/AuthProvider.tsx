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
  const [status, setStatus] = useState<AuthStatus>(() => {
    if (authSession.hasChecked()) {
      return authSession.getAccessToken() ? "authenticated" : "unauthenticated";
    }
    return "checking";
  });
  const [, setSessionCheckCount] = useState(0);
  const checkSessionPromiseRef = useRef<Promise<void> | null>(null);

  const notifySessionChecked = useCallback(() => {
    authSession.markSessionChecked();
    setSessionCheckCount((c) => c + 1);
  }, []);

  const checkSession = useCallback(async () => {
    setStatus("checking");
    try {
      let currentUser = user;
      if (!authSession.getAccessToken()) {
        await authSession.getOrStartRefresh();
        currentUser = authSession.getRestoredUser();
      }
      if (!currentUser) {
        currentUser = await authApi.getMe();
      }
      if (!currentUser.is_active) {
        authSession.clearSession();
        setUser(null);
        setStatus("unauthenticated");
        notifySessionChecked();
        return;
      }
      setUser(currentUser);
      setStatus("authenticated");
      notifySessionChecked();
    } catch {
      authSession.clearSession();
      setUser(null);
      setStatus("unauthenticated");
      notifySessionChecked();
    }
  }, [user, notifySessionChecked]);

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

  useEffect(() => {
    setAccessTokenProvider(() => authSession.getAccessToken());
    setRefreshHandler(() => authSession.getOrStartRefresh());

    const unsubscribe = authSession.onAuthFailure(() => {
      setUser(null);
      setStatus("unauthenticated");
      setSessionCheckCount((c) => c + 1);
    });

    if (!authSession.hasChecked()) {
      void ensureSessionChecked();
    }

    return () => {
      unsubscribe();
    };
  }, [ensureSessionChecked]);

  const login = useCallback(
    async (credentials: LoginRequest) => {
      const data = await authApi.login(credentials);
      authSession.setAccessToken(data.access_token);

      const loggedInUser = data.user;
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
    try {
      await authApi.logout();
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
