import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { env } from "../lib/env";

declare module "axios" {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

type AccessTokenProvider = () => string | null;
type RefreshHandler = () => Promise<string>;

let accessTokenProvider: AccessTokenProvider | null = null;
let refreshHandler: RefreshHandler | null = null;

export function setAccessTokenProvider(
  provider: AccessTokenProvider | null,
): void {
  accessTokenProvider = provider;
}

export function setRefreshHandler(handler: RefreshHandler | null): void {
  refreshHandler = handler;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 10000,
  headers: {
    Accept: "application/json",
  },
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessTokenProvider) {
      const token = accessTokenProvider();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: unknown) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (axios.isAxiosError(error) && error.config && error.response) {
      const { status } = error.response;
      const originalRequest = error.config;
      const url = originalRequest.url ?? "";

      const isExcludedAuthEndpoint =
        url.includes("/api/v1/auth/login") ||
        url.includes("/api/v1/auth/refresh") ||
        url.includes("/api/v1/auth/logout");

      if (
        status === 401 &&
        !originalRequest._retry &&
        !isExcludedAuthEndpoint
      ) {
        originalRequest._retry = true;
        if (!refreshHandler) {
          return Promise.reject(error);
        }
        try {
          const newToken = await refreshHandler();
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return apiClient(originalRequest);
        } catch (refreshError) {
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  },
);
