import { apiClient } from "./client";
import { normalizeApiError } from "./errors";
import {
  AuthTokensDto,
  AuthTokensDtoSchema,
  LoginRequest,
  RefreshTokenResponseDto,
  RefreshTokenResponseDtoSchema,
  UserDto,
  UserDtoSchema,
  ApiResponse,
} from "./types";

export const authApi = {
  async login(payload: LoginRequest): Promise<AuthTokensDto> {
    try {
      const response = await apiClient.post<ApiResponse<AuthTokensDto>>(
        "/api/v1/auth/login",
        payload,
      );
      return AuthTokensDtoSchema.parse(response.data.data);
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async refresh(refreshToken: string): Promise<RefreshTokenResponseDto> {
    try {
      const response = await apiClient.post<
        ApiResponse<RefreshTokenResponseDto>
      >("/api/v1/auth/refresh", { refresh_token: refreshToken });
      return RefreshTokenResponseDtoSchema.parse(response.data.data);
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async logout(refreshToken: string): Promise<void> {
    try {
      await apiClient.post("/api/v1/auth/logout", {
        refresh_token: refreshToken,
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
