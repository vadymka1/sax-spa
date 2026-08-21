import { z } from "zod";
import { apiClient } from "./client";
import { normalizeApiError } from "./errors";
import {
  AdminContentBlockDto,
  AdminContentBlockDtoSchema,
  ApiResponse,
  createApiResponseSchema,
  CreateContentBlockRequest,
  ReorderContentBlocksRequest,
  UpdateContentBlockRequest,
} from "./types";

const AdminContentBlockListResponseSchema = createApiResponseSchema(
  z.array(AdminContentBlockDtoSchema),
);

const SingleAdminContentBlockResponseSchema = createApiResponseSchema(
  AdminContentBlockDtoSchema,
);

export const contentBlocksApi = {
  async getContentBlocks(
    spaSectionId?: string,
  ): Promise<AdminContentBlockDto[]> {
    try {
      const response = await apiClient.get<ApiResponse<AdminContentBlockDto[]>>(
        "/api/v1/admin/content-blocks",
        {
          params: spaSectionId ? { spa_section_id: spaSectionId } : undefined,
        },
      );
      const parsed = AdminContentBlockListResponseSchema.parse(response.data);
      return parsed.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async createContentBlock(
    payload: CreateContentBlockRequest,
  ): Promise<AdminContentBlockDto> {
    try {
      const response = await apiClient.post<ApiResponse<AdminContentBlockDto>>(
        "/api/v1/admin/content-blocks",
        payload,
      );
      const parsed = SingleAdminContentBlockResponseSchema.parse(response.data);
      return parsed.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getContentBlock(id: string): Promise<AdminContentBlockDto> {
    try {
      const response = await apiClient.get<ApiResponse<AdminContentBlockDto>>(
        `/api/v1/admin/content-blocks/${id}`,
      );
      const parsed = SingleAdminContentBlockResponseSchema.parse(response.data);
      return parsed.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async updateContentBlock(
    id: string,
    payload: UpdateContentBlockRequest,
  ): Promise<AdminContentBlockDto> {
    try {
      const response = await apiClient.patch<ApiResponse<AdminContentBlockDto>>(
        `/api/v1/admin/content-blocks/${id}`,
        payload,
      );
      const parsed = SingleAdminContentBlockResponseSchema.parse(response.data);
      return parsed.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async deleteContentBlock(id: string): Promise<void> {
    try {
      await apiClient.delete(`/api/v1/admin/content-blocks/${id}`);
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async reorderContentBlocks(
    spaSectionId: string,
    payload: ReorderContentBlocksRequest,
  ): Promise<void> {
    try {
      await apiClient.post(
        `/api/v1/admin/spa-sections/${spaSectionId}/content-blocks/reorder`,
        payload,
      );
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
