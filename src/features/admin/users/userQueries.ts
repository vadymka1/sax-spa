import {
  useMutation,
  useQuery,
  useQueryClient,
  UseMutationResult,
  UseQueryResult,
} from "@tanstack/react-query";
import { usersApi } from "../../../api/usersApi";
import {
  CreateUserRequest,
  UpdateUserRequest,
  UserDto,
} from "../../../api/types";
import { AppApiError } from "../../../api/errors";

export const userKeys = {
  all: ["admin", "users"] as const,
  detail: (id: string) => ["admin", "users", id] as const,
};

export function useAdminUsers(options?: {
  enabled?: boolean;
}): UseQueryResult<UserDto[], AppApiError> {
  return useQuery({
    queryKey: userKeys.all,
    queryFn: () => usersApi.getUsers(),
    enabled: options?.enabled,
  });
}

export function useCreateUser(): UseMutationResult<
  UserDto,
  AppApiError,
  CreateUserRequest
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserRequest) => usersApi.createUser(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useUpdateUser(): UseMutationResult<
  UserDto,
  AppApiError,
  { id: string; payload: UpdateUserRequest }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => usersApi.updateUser(id, payload),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: userKeys.all });
      await queryClient.invalidateQueries({
        queryKey: userKeys.detail(data.id),
      });
    },
  });
}
