import { apiClient } from "./client";
import { normalizeApiError } from "./errors";
import {
  AuthResponseDto,
  AuthResponseDtoSchema,
  LoginRequest,
  UserDto,
  UserDtoSchema,
  ApiResponse,
} from "./types";

export const authApi = {
  async login(payload: LoginRequest): Promise<AuthResponseDto> {
    try {
      const response = await apiClient.post<ApiResponse<AuthResponseDto>>(
        "/api/v1/auth/login",
        payload,
        { withCredentials: true },
      );
      return AuthResponseDtoSchema.parse(response.data.data);
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async refresh(): Promise<AuthResponseDto> {
    try {
      const response = await apiClient.post<ApiResponse<AuthResponseDto>>(
        "/api/v1/auth/refresh",
        undefined,
        { withCredentials: true },
      );
      return AuthResponseDtoSchema.parse(response.data.data);
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/api/v1/auth/logout", undefined, {
        withCredentials: true,
      });
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getMe(): Promise<UserDto> {
    try {
      const response =
        await apiClient.get<ApiResponse<UserDto>>("/api/v1/auth/me");
      return UserDtoSchema.parse(response.data.data);
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
