import { apiClient } from "./client";
import { normalizeApiError } from "./errors";
import {
  AdminPageAppearanceDto,
  AdminPageAppearanceDtoSchema,
  ApiResponse,
  createApiResponseSchema,
  UpdatePageAppearanceRequest,
} from "./types";

const SingleAdminPageAppearanceResponseSchema = createApiResponseSchema(
  AdminPageAppearanceDtoSchema,
);

export const pageAppearanceApi = {
  async getPageAppearance(): Promise<AdminPageAppearanceDto> {
    try {
      const response = await apiClient.get<ApiResponse<AdminPageAppearanceDto>>(
        "/api/v1/admin/page-appearance",
      );
      const parsed = SingleAdminPageAppearanceResponseSchema.parse(
        response.data,
      );
      return parsed.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async updatePageAppearance(
    payload: UpdatePageAppearanceRequest,
  ): Promise<AdminPageAppearanceDto> {
    try {
      const response = await apiClient.patch<
        ApiResponse<AdminPageAppearanceDto>
      >("/api/v1/admin/page-appearance", payload);
      const parsed = SingleAdminPageAppearanceResponseSchema.parse(
        response.data,
      );
      return parsed.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
