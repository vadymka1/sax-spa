import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { publicApi } from "../api/publicApi";
import { PublicPageResponse } from "../api/types";
import { AppApiError } from "../api/errors";
import { Locale, DEFAULT_LOCALE } from "../lib/locale";

export const publicPageQueryKey = (locale: Locale = DEFAULT_LOCALE) =>
  ["publicPage", locale] as const;

export function usePublicPage(
  locale: Locale = DEFAULT_LOCALE,
): UseQueryResult<PublicPageResponse, AppApiError> {
  return useQuery({
    queryKey: publicPageQueryKey(locale),
    queryFn: () => publicApi.getPublicPage(locale),
    staleTime: 1000 * 60 * 5, // 5 minutes sensible default
    retry: 2,
    placeholderData: (previousData) => previousData,
  });
}
