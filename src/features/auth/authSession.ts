import { authApi } from "../../api/authApi";
import { UserDto } from "../../api/types";

type AuthFailureListener = () => void;

class AuthSession {
  private accessToken: string | null = null;
  private restoredUser: UserDto | null = null;
  private sessionGeneration = 0;
  private refreshPromise: Promise<string> | null = null;
  private hasCheckedSession = false;
  private failureListeners: Set<AuthFailureListener> = new Set();

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRestoredUser(): UserDto | null {
    return this.restoredUser;
  }

  setAccessToken(access: string | null): void {
    this.accessToken = access;
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
    this.restoredUser = null;
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
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const currentGeneration = this.sessionGeneration;

    this.refreshPromise = (async () => {
      try {
        const data = await authApi.refresh();
        if (this.sessionGeneration === currentGeneration) {
          this.accessToken = data.access_token;
          this.restoredUser = data.user;
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
