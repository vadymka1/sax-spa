import {
  useMutation,
  useQuery,
  useQueryClient,
  UseMutationResult,
  UseQueryResult,
} from "@tanstack/react-query";
import { testimonialsApi } from "../../../api/testimonialsApi";
import {
  AdminTestimonialDto,
  CreateTestimonialRequest,
  ReorderTestimonialsRequest,
  UpdateTestimonialRequest,
} from "../../../api/types";
import { AppApiError } from "../../../api/errors";

export const testimonialKeys = {
  all: ["admin", "testimonials"] as const,
  detail: (id: string) => ["admin", "testimonials", "detail", id] as const,
};

export function useAdminTestimonials(): UseQueryResult<
  AdminTestimonialDto[],
  AppApiError
> {
  return useQuery({
    queryKey: testimonialKeys.all,
    queryFn: () => testimonialsApi.listTestimonials(),
  });
}

export function useCreateTestimonial(): UseMutationResult<
  AdminTestimonialDto,
  AppApiError,
  CreateTestimonialRequest
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTestimonialRequest) =>
      testimonialsApi.createTestimonial(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: testimonialKeys.all,
      });
    },
  });
}

export interface UpdateTestimonialVariables {
  id: string;
  payload: UpdateTestimonialRequest;
}

export function useUpdateTestimonial(): UseMutationResult<
  AdminTestimonialDto,
  AppApiError,
  UpdateTestimonialVariables
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: UpdateTestimonialVariables) =>
      testimonialsApi.updateTestimonial(id, payload),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({
        queryKey: testimonialKeys.all,
      });
      await queryClient.invalidateQueries({
        queryKey: testimonialKeys.detail(data.id),
      });
    },
  });
}

export function useDeleteTestimonial(): UseMutationResult<
  void,
  AppApiError,
  string
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => testimonialsApi.deleteTestimonial(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: testimonialKeys.all,
      });
    },
  });
}

export function useReorderTestimonials(): UseMutationResult<
  void,
  AppApiError,
  ReorderTestimonialsRequest
> {
  return useMutation({
    mutationFn: (payload: ReorderTestimonialsRequest) =>
      testimonialsApi.reorderTestimonials(payload),
  });
}

export function useApproveTestimonial(): UseMutationResult<
  void,
  AppApiError,
  string
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => testimonialsApi.approveTestimonial(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: testimonialKeys.all,
      });
    },
  });
}

export function useRejectTestimonial(): UseMutationResult<
  void,
  AppApiError,
  string
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => testimonialsApi.rejectTestimonial(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: testimonialKeys.all,
      });
    },
  });
}
