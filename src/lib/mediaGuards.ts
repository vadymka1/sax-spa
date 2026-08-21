import {
  AdminImageMediaSchema,
  AdminMediaDto,
  AdminVideoMediaSchema,
  AdminYoutubeMediaSchema,
  BlockAttachedMediaDto,
  ContentBlockType,
  PublicImageMedia,
  PublicMedia,
  PublicVideoMedia,
  PublicYoutubeMedia,
} from "../api/types";
import { z } from "zod";

type AdminImageMedia = z.infer<typeof AdminImageMediaSchema>;
type AdminVideoMedia = z.infer<typeof AdminVideoMediaSchema>;
type AdminYoutubeMedia = z.infer<typeof AdminYoutubeMediaSchema>;

export function isImageMedia(
  media: PublicMedia | null | undefined,
): media is PublicImageMedia {
  return media?.type === "image";
}

export function isVideoMedia(
  media: PublicMedia | null | undefined,
): media is PublicVideoMedia {
  return media?.type === "video";
}

export function isYoutubeMedia(
  media: PublicMedia | null | undefined,
): media is PublicYoutubeMedia {
  return media?.type === "youtube";
}

export function isAdminImageMedia(
  media: AdminMediaDto | null | undefined,
): media is AdminImageMedia {
  return media?.type === "image";
}

export function isAdminVideoMedia(
  media: AdminMediaDto | null | undefined,
): media is AdminVideoMedia {
  return media?.type === "video";
}

export function isAdminYoutubeMedia(
  media: AdminMediaDto | null | undefined,
): media is AdminYoutubeMedia {
  return media?.type === "youtube";
}

export function isMediaCompatibleWithBlockType(
  blockType: ContentBlockType,
  mediaType?: string | null,
): boolean {
  switch (blockType) {
    case "text":
      return !mediaType;
    case "text_image":
      return mediaType === "image";
    case "text_video":
      return mediaType === "video";
    case "text_youtube":
      return mediaType === "youtube";
    default:
      return false;
  }
}

export interface ContentBlockDraftOptions {
  blockType: ContentBlockType;
  existingMedia?: BlockAttachedMediaDto | null;
  newFile?: File | null;
  youtubeUrl?: string;
  isEdit?: boolean;
}

export function validateContentBlockDraft(
  options: ContentBlockDraftOptions,
): string | null {
  const { blockType, existingMedia, newFile, youtubeUrl } = options;

  switch (blockType) {
    case "text":
      return null;

    case "text_image": {
      if (newFile) {
        if (newFile.type && !newFile.type.startsWith("image/")) {
          return "Selected file must be an image file.";
        }
        return null;
      }
      if (existingMedia && existingMedia.media_type === "image") {
        return null;
      }
      return "An image file is required for Text + Image blocks.";
    }

    case "text_video": {
      if (newFile) {
        if (newFile.type && !newFile.type.startsWith("video/")) {
          return "Selected file must be a video file.";
        }
        return null;
      }
      if (existingMedia && existingMedia.media_type === "video") {
        return null;
      }
      return "A video file is required for Text + Video blocks.";
    }

    case "text_youtube": {
      if (youtubeUrl && youtubeUrl.trim()) {
        return null;
      }
      if (existingMedia && existingMedia.media_type === "youtube") {
        return null;
      }
      return "A YouTube URL or ID is required for Text + YouTube blocks.";
    }

    default:
      return "Invalid content block type.";
  }
}
