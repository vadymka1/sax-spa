import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from "@tanstack/react-query";
import { spaSectionsApi } from "../../../api/spaSectionsApi";
import {
  AdminSpaSectionDto,
  CreateSpaSectionRequest,
  UpdateSpaSectionRequest,
} from "../../../api/types";
import { AppApiError } from "../../../api/errors";

export const spaSectionKeys = {
  all: ["admin", "spa-sections"] as const,
  detail: (id: string) => ["admin", "spa-sections", id] as const,
};

export function useAdminSpaSections(): UseQueryResult<
  AdminSpaSectionDto[],
  AppApiError
> {
  return useQuery({
    queryKey: spaSectionKeys.all,
    queryFn: () => spaSectionsApi.getSpaSections(),
  });
}

export function useCreateSpaSection(): UseMutationResult<
  AdminSpaSectionDto,
  AppApiError,
  CreateSpaSectionRequest
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSpaSectionRequest) =>
      spaSectionsApi.createSpaSection(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: spaSectionKeys.all });
    },
  });
}

export function useUpdateSpaSection(): UseMutationResult<
  AdminSpaSectionDto,
  AppApiError,
  { id: string; payload: UpdateSpaSectionRequest }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) =>
      spaSectionsApi.updateSpaSection(id, payload),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: spaSectionKeys.all });
      await queryClient.invalidateQueries({
        queryKey: spaSectionKeys.detail(data.id),
      });
    },
  });
}

export function useDeleteSpaSection(): UseMutationResult<
  void,
  AppApiError,
  string
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => spaSectionsApi.deleteSpaSection(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: spaSectionKeys.all });
    },
  });
}
