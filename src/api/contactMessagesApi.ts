import { z } from "zod";
import { apiClient } from "./client";
import { normalizeApiError } from "./errors";
import {
  AdminContactMessageDto,
  AdminContactMessageDtoSchema,
  ApiResponse,
  createApiResponseSchema,
} from "./types";

const AdminContactMessageListResponseSchema = createApiResponseSchema(
  z.array(AdminContactMessageDtoSchema),
);

const SingleAdminContactMessageResponseSchema = createApiResponseSchema(
  AdminContactMessageDtoSchema,
);

export const contactMessagesApi = {
  async listMessages(): Promise<AdminContactMessageDto[]> {
    try {
      const response = await apiClient.get<
        ApiResponse<AdminContactMessageDto[]>
      >("/api/v1/admin/contact-messages");
      const parsed = AdminContactMessageListResponseSchema.parse(response.data);
      return parsed.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async getMessage(id: string): Promise<AdminContactMessageDto> {
    try {
      const response = await apiClient.get<ApiResponse<AdminContactMessageDto>>(
        `/api/v1/admin/contact-messages/${id}`,
      );
      const parsed = SingleAdminContactMessageResponseSchema.parse(
        response.data,
      );
      return parsed.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async markAsRead(id: string): Promise<void> {
    try {
      await apiClient.post(`/api/v1/admin/contact-messages/${id}/read`);
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async markAsUnread(id: string): Promise<void> {
    try {
      await apiClient.post(`/api/v1/admin/contact-messages/${id}/unread`);
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
