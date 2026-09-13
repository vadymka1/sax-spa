import {
  useMutation,
  useQuery,
  useQueryClient,
  UseMutationResult,
  UseQueryResult,
} from "@tanstack/react-query";
import { contactMessagesApi } from "../../../api/contactMessagesApi";
import { AdminContactMessageDto } from "../../../api/types";
import { AppApiError } from "../../../api/errors";

export const contactMessageKeys = {
  all: ["admin", "contact-messages"] as const,
  detail: (id: string) => ["admin", "contact-messages", "detail", id] as const,
};

export function useAdminContactMessages(): UseQueryResult<
  AdminContactMessageDto[],
  AppApiError
> {
  return useQuery({
    queryKey: contactMessageKeys.all,
    queryFn: () => contactMessagesApi.listMessages(),
  });
}

export function useAdminContactMessage(
  id: string,
): UseQueryResult<AdminContactMessageDto, AppApiError> {
  return useQuery({
    queryKey: contactMessageKeys.detail(id),
    queryFn: () => contactMessagesApi.getMessage(id),
    enabled: Boolean(id),
  });
}

export function useMarkContactMessageRead(): UseMutationResult<
  void,
  AppApiError,
  string
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => contactMessagesApi.markAsRead(id),
    onSuccess: async (_, id) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: contactMessageKeys.all,
        }),
        queryClient.invalidateQueries({
          queryKey: contactMessageKeys.detail(id),
        }),
      ]);
    },
  });
}

export function useMarkContactMessageUnread(): UseMutationResult<
  void,
  AppApiError,
  string
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => contactMessagesApi.markAsUnread(id),
    onSuccess: async (_, id) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: contactMessageKeys.all,
        }),
        queryClient.invalidateQueries({
          queryKey: contactMessageKeys.detail(id),
        }),
      ]);
    },
  });
}
