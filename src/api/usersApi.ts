import { z } from "zod";
import { apiClient } from "./client";
import { normalizeApiError } from "./errors";
import {
  ApiResponse,
  CreateUserRequest,
  UpdateUserRequest,
  UserDto,
  UserDtoSchema,
} from "./types";

export const usersApi = {
  async getUsers(): Promise<UserDto[]> {
    try {
      const response = await apiClient.get<ApiResponse<UserDto[]>>(
        "/api/v1/admin/users",
      );
      return z.array(UserDtoSchema).parse(response.data.data);
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getUser(id: string): Promise<UserDto> {
    try {
      const response = await apiClient.get<ApiResponse<UserDto>>(
        `/api/v1/admin/users/${id}`,
      );
      return UserDtoSchema.parse(response.data.data);
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async createUser(payload: CreateUserRequest): Promise<UserDto> {
    try {
      const response = await apiClient.post<ApiResponse<UserDto>>(
        "/api/v1/admin/users",
        payload,
      );
      return UserDtoSchema.parse(response.data.data);
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async updateUser(id: string, payload: UpdateUserRequest): Promise<UserDto> {
    try {
      const response = await apiClient.patch<ApiResponse<UserDto>>(
        `/api/v1/admin/users/${id}`,
        payload,
      );
      return UserDtoSchema.parse(response.data.data);
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
