import {
  useMutation,
  useQuery,
  useQueryClient,
  UseMutationResult,
  UseQueryResult,
} from "@tanstack/react-query";
import { contentBlocksApi } from "../../../api/contentBlocksApi";
import { mediaApi } from "../../../api/mediaApi";
import {
  AdminContentBlockDto,
  AdminImageMedia,
  AdminMediaDto,
  AdminVideoMedia,
  AdminYoutubeMedia,
  CreateContentBlockRequest,
  CreateYoutubeMediaRequest,
  ReorderContentBlocksRequest,
  UpdateContentBlockRequest,
} from "../../../api/types";
import { AppApiError } from "../../../api/errors";
import { spaSectionKeys } from "../sections/sectionQueries";

export const contentBlockKeys = {
  all: ["admin", "content-blocks"] as const,
  bySection: (spaSectionId: string) =>
    ["admin", "content-blocks", "section", spaSectionId] as const,
  detail: (id: string) => ["admin", "content-blocks", "detail", id] as const,
};

export const mediaKeys = {
  all: ["admin", "media"] as const,
  detail: (id: string) => ["admin", "media", "detail", id] as const,
};

export function useAdminContentBlocks(
  spaSectionId?: string,
): UseQueryResult<AdminContentBlockDto[], AppApiError> {
  return useQuery({
    queryKey: spaSectionId
      ? contentBlockKeys.bySection(spaSectionId)
      : contentBlockKeys.all,
    queryFn: () => contentBlocksApi.getContentBlocks(spaSectionId),
    enabled: Boolean(spaSectionId),
  });
}

export function useCreateContentBlock(): UseMutationResult<
  AdminContentBlockDto,
  AppApiError,
  CreateContentBlockRequest
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateContentBlockRequest) =>
      contentBlocksApi.createContentBlock(payload),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({
        queryKey: contentBlockKeys.bySection(data.spa_section_id),
      });
      await queryClient.invalidateQueries({ queryKey: spaSectionKeys.all });
    },
  });
}

export interface UpdateContentBlockVariables {
  id: string;
  sourceSpaSectionId: string;
  payload: UpdateContentBlockRequest;
}

export function useUpdateContentBlock(): UseMutationResult<
  AdminContentBlockDto,
  AppApiError,
  UpdateContentBlockVariables
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: UpdateContentBlockVariables) =>
      contentBlocksApi.updateContentBlock(id, payload),
    onSuccess: async (data, variables) => {
      const sourceSectionId = variables.sourceSpaSectionId;
      const destinationSectionId = data.spa_section_id;

      await queryClient.invalidateQueries({
        queryKey: contentBlockKeys.bySection(sourceSectionId),
      });

      if (destinationSectionId !== sourceSectionId) {
        await queryClient.invalidateQueries({
          queryKey: contentBlockKeys.bySection(destinationSectionId),
        });
      }

      await queryClient.invalidateQueries({
        queryKey: contentBlockKeys.detail(data.id),
      });
      await queryClient.invalidateQueries({ queryKey: spaSectionKeys.all });
    },
  });
}

export function useDeleteContentBlock(
  spaSectionId: string,
): UseMutationResult<void, AppApiError, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => contentBlocksApi.deleteContentBlock(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: contentBlockKeys.bySection(spaSectionId),
      });
      await queryClient.invalidateQueries({ queryKey: spaSectionKeys.all });
    },
  });
}

export interface ReorderContentBlocksVariables {
  spaSectionId: string;
  items: ReorderContentBlocksRequest["items"];
}

export function useReorderContentBlocks(): UseMutationResult<
  void,
  AppApiError,
  ReorderContentBlocksVariables
> {
  return useMutation({
    mutationFn: ({ spaSectionId, items }: ReorderContentBlocksVariables) =>
      contentBlocksApi.reorderContentBlocks(spaSectionId, { items }),
  });
}

export function useUploadMedia(): UseMutationResult<
  AdminMediaDto,
  AppApiError,
  File
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => mediaApi.uploadMedia(file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: mediaKeys.all });
    },
  });
}

export function useUploadImageMedia(): UseMutationResult<
  AdminImageMedia,
  AppApiError,
  File
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => mediaApi.uploadImageMedia(file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: mediaKeys.all });
    },
  });
}

export function useUploadVideoMedia(): UseMutationResult<
  AdminVideoMedia,
  AppApiError,
  File
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => mediaApi.uploadVideoMedia(file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: mediaKeys.all });
    },
  });
}

export function useCreateYoutubeMedia(): UseMutationResult<
  AdminYoutubeMedia,
  AppApiError,
  CreateYoutubeMediaRequest
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateYoutubeMediaRequest) =>
      mediaApi.createYoutubeMedia(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: mediaKeys.all });
    },
  });
}

export function useAdminMediaList(): UseQueryResult<
  AdminMediaDto[],
  AppApiError
> {
  return useQuery({
    queryKey: mediaKeys.all,
    queryFn: () => mediaApi.listMedia(),
  });
}
