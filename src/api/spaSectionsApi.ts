import { z } from "zod";
import { apiClient } from "./client";
import { normalizeApiError } from "./errors";
import {
  AdminSpaSectionDto,
  AdminSpaSectionDtoSchema,
  ApiResponse,
  CreateSpaSectionRequest,
  ReorderSpaSectionsRequest,
  UpdateSpaSectionRequest,
} from "./types";

export const spaSectionsApi = {
  async getSpaSections(): Promise<AdminSpaSectionDto[]> {
    try {
      const response = await apiClient.get<ApiResponse<AdminSpaSectionDto[]>>(
        "/api/v1/admin/spa-sections",
      );
      return z.array(AdminSpaSectionDtoSchema).parse(response.data.data);
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async createSpaSection(
    payload: CreateSpaSectionRequest,
  ): Promise<AdminSpaSectionDto> {
    try {
      const response = await apiClient.post<ApiResponse<AdminSpaSectionDto>>(
        "/api/v1/admin/spa-sections",
        payload,
      );
      return AdminSpaSectionDtoSchema.parse(response.data.data);
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getSpaSection(id: string): Promise<AdminSpaSectionDto> {
    try {
      const response = await apiClient.get<ApiResponse<AdminSpaSectionDto>>(
        `/api/v1/admin/spa-sections/${id}`,
      );
      return AdminSpaSectionDtoSchema.parse(response.data.data);
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async updateSpaSection(
    id: string,
    payload: UpdateSpaSectionRequest,
  ): Promise<AdminSpaSectionDto> {
    try {
      const response = await apiClient.patch<ApiResponse<AdminSpaSectionDto>>(
        `/api/v1/admin/spa-sections/${id}`,
        payload,
      );
      return AdminSpaSectionDtoSchema.parse(response.data.data);
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async deleteSpaSection(id: string): Promise<void> {
    try {
      await apiClient.delete(`/api/v1/admin/spa-sections/${id}`);
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async reorderSpaSections(payload: ReorderSpaSectionsRequest): Promise<void> {
    try {
      await apiClient.post("/api/v1/admin/spa-sections/reorder", payload);
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
