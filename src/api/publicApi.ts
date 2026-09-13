import { apiClient } from "./client";
import { normalizeApiError } from "./errors";
import {
  ContactRequest,
  CreatePublicTestimonialRequest,
  PublicPageEnvelopeSchema,
  PublicPageResponse,
  PublicTestimonialSubmissionResponse,
  PublicTestimonialSubmissionResponseSchema,
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

  async submitTestimonial(
    payload: CreatePublicTestimonialRequest,
  ): Promise<PublicTestimonialSubmissionResponse> {
    try {
      const response = await apiClient.post(
        "/api/v1/public/testimonials",
        payload,
      );
      const data =
        response.data &&
        typeof response.data === "object" &&
        "data" in response.data
          ? response.data.data
          : response.data;
      return PublicTestimonialSubmissionResponseSchema.parse(data);
    } catch (error) {
      throw normalizeApiError(error);
    }
  },
};
