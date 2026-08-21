import { authApi } from "../../api/authApi";

type AuthFailureListener = () => void;

class AuthSession {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private sessionGeneration = 0;
  private refreshPromise: Promise<string> | null = null;
  private hasCheckedSession = false;
  private failureListeners: Set<AuthFailureListener> = new Set();

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  setTokens(access: string | null, refresh: string | null): void {
    this.accessToken = access;
    this.refreshToken = refresh;
  }

  hasChecked(): boolean {
    return this.hasCheckedSession;
  }

  markSessionChecked(): void {
    this.hasCheckedSession = true;
  }

  resetCheckedState(): void {
    this.hasCheckedSession = false;
  }

  clearSession(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.sessionGeneration += 1;
    this.refreshPromise = null;
    this.hasCheckedSession = true;
    this.notifyFailureListeners();
  }

  onAuthFailure(listener: AuthFailureListener): () => void {
    this.failureListeners.add(listener);
    return () => {
      this.failureListeners.delete(listener);
    };
  }

  private notifyFailureListeners(): void {
    this.failureListeners.forEach((listener) => {
      try {
        listener();
      } catch {
        // Ignore listener callback exceptions
      }
    });
  }

  getOrStartRefresh(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.clearSession();
      return Promise.reject(new Error("No refresh token available"));
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const currentGeneration = this.sessionGeneration;

    this.refreshPromise = (async () => {
      try {
        const data = await authApi.refresh(refreshToken);
        if (this.sessionGeneration === currentGeneration) {
          this.accessToken = data.access_token;
          if (data.refresh_token) {
            this.refreshToken = data.refresh_token;
          }
          this.hasCheckedSession = true;
          return data.access_token;
        }
        throw new Error("Session generation mismatch after refresh");
      } catch (error) {
        if (this.sessionGeneration === currentGeneration) {
          this.clearSession();
        }
        throw error;
      }
    })().finally(() => {
      this.refreshPromise = null;
      this.hasCheckedSession = true;
    });

    return this.refreshPromise;
  }
}

export const authSession = new AuthSession();
