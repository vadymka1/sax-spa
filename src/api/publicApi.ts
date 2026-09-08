import { apiClient } from "./client";
import { normalizeApiError } from "./errors";
import {
  ContactRequest,
  PublicPageEnvelopeSchema,
  PublicPageResponse,
} from "./types";

export const publicApi = {
  async getPublicPage(): Promise<PublicPageResponse> {
    try {
      const response = await apiClient.get("/api/v1/public/page");
      const parsed = PublicPageEnvelopeSchema.parse(response.data);
      return parsed.data;
    } catch (error) {
      throw normalizeApiError(error);
    }
  },

  async submitContactMessage(payload: ContactRequest): Promise<void> {
    try {
      await apiClient.post("/api/v1/public/contact", payload);
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
