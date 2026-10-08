import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from "@tanstack/react-query";
import { pageAppearanceApi } from "../../../api/pageAppearanceApi";
import {
  AdminPageAppearanceDto,
  UpdatePageAppearanceRequest,
} from "../../../api/types";
import { AppApiError } from "../../../api/errors";

export const appearanceKeys = {
  all: ["admin", "page-appearance"] as const,
};

export function usePageAppearance(): UseQueryResult<
  AdminPageAppearanceDto,
  AppApiError
> {
  return useQuery({
    queryKey: appearanceKeys.all,
    queryFn: () => pageAppearanceApi.getPageAppearance(),
  });
}

export function useUpdatePageAppearance(): UseMutationResult<
  AdminPageAppearanceDto,
  AppApiError,
  UpdatePageAppearanceRequest
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdatePageAppearanceRequest) =>
      pageAppearanceApi.updatePageAppearance(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: appearanceKeys.all });
      await queryClient.invalidateQueries({ queryKey: ["publicPage"] });
    },
  });
}
