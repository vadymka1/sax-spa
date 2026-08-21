import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { publicApi } from "../api/publicApi";
import { PublicPageResponse } from "../api/types";
import { AppApiError } from "../api/errors";

export const publicPageQueryKey = ["publicPage"] as const;

export function usePublicPage(): UseQueryResult<
  PublicPageResponse,
  AppApiError
> {
  return useQuery({
    queryKey: publicPageQueryKey,
    queryFn: () => publicApi.getPublicPage(),
    staleTime: 1000 * 60 * 5, // 5 minutes sensible default
    retry: 2,
  });
}
