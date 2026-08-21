import { z } from "zod";
import { apiClient } from "./client";
import { normalizeApiError } from "./errors";
import {
  AdminImageMedia,
  AdminImageMediaSchema,
  AdminMediaDto,
  AdminMediaDtoSchema,
  AdminVideoMedia,
  AdminVideoMediaSchema,
  AdminYoutubeMedia,
  AdminYoutubeMediaSchema,
  ApiResponse,
  createApiResponseSchema,
  CreateYoutubeMediaRequest,
} from "./types";

const SingleAdminMediaResponseSchema =
  createApiResponseSchema(AdminMediaDtoSchema);

const SingleAdminImageMediaResponseSchema = createApiResponseSchema(
  AdminImageMediaSchema,
);

const SingleAdminVideoMediaResponseSchema = createApiResponseSchema(
  AdminVideoMediaSchema,
);

const SingleAdminYoutubeMediaResponseSchema = createApiResponseSchema(
  AdminYoutubeMediaSchema,
);

const AdminMediaListResponseSchema = createApiResponseSchema(
  z.array(AdminMediaDtoSchema),
);

export const mediaApi = {
  async uploadMedia(file: File): Promise<AdminMediaDto> {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiClient.post<ApiResponse<AdminMediaDto>>(
        "/api/v1/admin/media/upload",
        formData,
      );
      const parsed = SingleAdminMediaResponseSchema.parse(response.data);
      return parsed.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async uploadImageMedia(file: File): Promise<AdminImageMedia> {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiClient.post<ApiResponse<AdminImageMedia>>(
        "/api/v1/admin/media/upload",
        formData,
      );
      const parsed = SingleAdminImageMediaResponseSchema.parse(response.data);
      return parsed.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async uploadVideoMedia(file: File): Promise<AdminVideoMedia> {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiClient.post<ApiResponse<AdminVideoMedia>>(
        "/api/v1/admin/media/upload",
        formData,
      );
      const parsed = SingleAdminVideoMediaResponseSchema.parse(response.data);
      return parsed.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async createYoutubeMedia(
    payload: CreateYoutubeMediaRequest,
  ): Promise<AdminYoutubeMedia> {
    try {
      const response = await apiClient.post<ApiResponse<AdminYoutubeMedia>>(
        "/api/v1/admin/media/youtube",
        payload,
      );
      const parsed = SingleAdminYoutubeMediaResponseSchema.parse(response.data);
      return parsed.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async listMedia(): Promise<AdminMediaDto[]> {
    try {
      const response = await apiClient.get<ApiResponse<AdminMediaDto[]>>(
        "/api/v1/admin/media",
      );
      const parsed = AdminMediaListResponseSchema.parse(response.data);
      return parsed.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getMedia(id: string): Promise<AdminMediaDto> {
    try {
      const response = await apiClient.get<ApiResponse<AdminMediaDto>>(
        `/api/v1/admin/media/${id}`,
      );
      const parsed = SingleAdminMediaResponseSchema.parse(response.data);
      return parsed.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async deleteMedia(id: string): Promise<void> {
    try {
      await apiClient.delete(`/api/v1/admin/media/${id}`);
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
