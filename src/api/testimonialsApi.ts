import { z } from "zod";
import { apiClient } from "./client";
import { normalizeApiError } from "./errors";
import {
  AdminTestimonialDto,
  AdminTestimonialDtoSchema,
  ApiResponse,
  createApiResponseSchema,
  CreateTestimonialRequest,
  ReorderTestimonialsRequest,
  UpdateTestimonialRequest,
} from "./types";

const AdminTestimonialListResponseSchema = createApiResponseSchema(
  z.array(AdminTestimonialDtoSchema),
);

const SingleAdminTestimonialResponseSchema = createApiResponseSchema(
  AdminTestimonialDtoSchema,
);

export const testimonialsApi = {
  async listTestimonials(): Promise<AdminTestimonialDto[]> {
    try {
      const response = await apiClient.get<ApiResponse<AdminTestimonialDto[]>>(
        "/api/v1/admin/testimonials",
      );
      const parsed = AdminTestimonialListResponseSchema.parse(response.data);
      return parsed.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getTestimonial(id: string): Promise<AdminTestimonialDto> {
    try {
      const response = await apiClient.get<ApiResponse<AdminTestimonialDto>>(
        `/api/v1/admin/testimonials/${id}`,
      );
      const parsed = SingleAdminTestimonialResponseSchema.parse(response.data);
      return parsed.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async createTestimonial(
    payload: CreateTestimonialRequest,
  ): Promise<AdminTestimonialDto> {
    try {
      const response = await apiClient.post<ApiResponse<AdminTestimonialDto>>(
        "/api/v1/admin/testimonials",
        payload,
      );
      const parsed = SingleAdminTestimonialResponseSchema.parse(response.data);
      return parsed.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async updateTestimonial(
    id: string,
    payload: UpdateTestimonialRequest,
  ): Promise<AdminTestimonialDto> {
    try {
      const response = await apiClient.patch<ApiResponse<AdminTestimonialDto>>(
        `/api/v1/admin/testimonials/${id}`,
        payload,
      );
      const parsed = SingleAdminTestimonialResponseSchema.parse(response.data);
      return parsed.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async deleteTestimonial(id: string): Promise<void> {
    try {
      await apiClient.delete(`/api/v1/admin/testimonials/${id}`);
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async reorderTestimonials(
    payload: ReorderTestimonialsRequest,
  ): Promise<void> {
    try {
      await apiClient.post("/api/v1/admin/testimonials/reorder", payload);
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async approveTestimonial(id: string): Promise<void> {
    try {
      await apiClient.post(`/api/v1/admin/testimonials/${id}/approve`);
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async rejectTestimonial(id: string): Promise<void> {
    try {
      await apiClient.post(`/api/v1/admin/testimonials/${id}/reject`);
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
