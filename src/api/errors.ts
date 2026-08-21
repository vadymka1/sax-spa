import { isAxiosError } from "axios";
import { ZodError } from "zod";

export interface ApiErrorDetails {
  field: string;
  message: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: ApiErrorDetails[];
  request_id?: string;
}

export interface ApiErrorResponse {
  error: ApiErrorPayload;
}

export interface AppApiError {
  status?: number;
  code?: string;
  message: string;
  requestId?: string;
  details?: ApiErrorDetails[];
}

export function isAppApiError(error: unknown): error is AppApiError {
  if (typeof error !== "object" || error === null || isAxiosError(error)) {
    return false;
  }
  const obj = error as Record<string, unknown>;
  return (
    typeof obj.message === "string" &&
    (typeof obj.code === "string" ||
      typeof obj.status === "number" ||
      typeof obj.requestId === "string")
  );
}

export function isApiErrorResponse(data: unknown): data is ApiErrorResponse {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj.error !== "object" || obj.error === null) {
    return false;
  }
  const err = obj.error as Record<string, unknown>;
  return typeof err.code === "string" && typeof err.message === "string";
}

export function normalizeApiError(error: unknown): AppApiError {
  if (isAppApiError(error)) {
    return error;
  }

  if (isAxiosError(error)) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (isApiErrorResponse(data)) {
        return {
          status,
          code: data.error.code,
          message: data.error.message,
          requestId: data.error.request_id,
          details: data.error.details,
        };
      }

      return {
        status,
        code: "HTTP_ERROR",
        message:
          typeof data === "string" && data.length > 0
            ? data
            : `HTTP request failed with status ${status}`,
      };
    }

    if (error.code === "ECONNABORTED") {
      return {
        code: "TIMEOUT",
        message: "Request timed out. Please check your internet connection.",
      };
    }

    if (error.request) {
      return {
        code: "NETWORK_ERROR",
        message: "Network error. Could not connect to the backend server.",
      };
    }
  }

  if (error instanceof ZodError) {
    return {
      code: "INVALID_API_RESPONSE",
      message: "The server returned an unexpected response.",
    };
  }

  if (error instanceof Error) {
    return {
      code: "UNEXPECTED_ERROR",
      message: error.message,
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: "An unexpected error occurred.",
  };
}
