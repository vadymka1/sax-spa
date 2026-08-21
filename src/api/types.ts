import { z } from "zod";

// Generic API Envelope
export interface ApiResponse<T> {
  data: T;
}

export function createApiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema,
  });
}

// Public API Schemas & Types
export const PublicPageSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  seo_title: z.string().nullable().optional(),
  seo_description: z.string().nullable().optional(),
  seo_keywords: z.array(z.string()).nullable().optional(),
});
export type PublicPage = z.infer<typeof PublicPageSchema>;

export const ContentBlockTypeSchema = z.enum([
  "text",
  "text_image",
  "text_video",
  "text_youtube",
]);
export type ContentBlockType = z.infer<typeof ContentBlockTypeSchema>;

export const PublicImageMediaSchema = z.object({
  type: z.literal("image"),
  id: z.string().uuid(),
  url: z.string(),
  alt_text: z.string().nullable().optional(),
});
export type PublicImageMedia = z.infer<typeof PublicImageMediaSchema>;

export const PublicVideoMediaSchema = z.object({
  type: z.literal("video"),
  id: z.string().uuid(),
  url: z.string(),
  mime_type: z.string().nullable().optional(),
});
export type PublicVideoMedia = z.infer<typeof PublicVideoMediaSchema>;

export const PublicYoutubeMediaSchema = z.object({
  type: z.literal("youtube"),
  id: z.string().uuid(),
  youtube_video_id: z.string(),
  embed_url: z.string(),
  thumbnail_url: z.string(),
});
export type PublicYoutubeMedia = z.infer<typeof PublicYoutubeMediaSchema>;

export const PublicMediaSchema = z.discriminatedUnion("type", [
  PublicImageMediaSchema,
  PublicVideoMediaSchema,
  PublicYoutubeMediaSchema,
]);
export type PublicMedia = z.infer<typeof PublicMediaSchema>;

export const PublicContentBlockSchema = z.object({
  id: z.string().uuid(),
  block_type: ContentBlockTypeSchema,
  title: z.string().nullable().optional(),
  text: z.string(),
  media: PublicMediaSchema.nullable().optional(),
  sort_order: z.number().int(),
});
export type PublicContentBlock = z.infer<typeof PublicContentBlockSchema>;

export const PublicSpaSectionSchema = z.object({
  id: z.string().uuid(),
  key: z.string(),
  title: z.string(),
  navigation_label: z.string(),
  sort_order: z.number().int(),
  blocks: z.array(PublicContentBlockSchema),
});
export type PublicSpaSection = z.infer<typeof PublicSpaSectionSchema>;

export const PublicPageResponseSchema = z.object({
  page: PublicPageSchema,
  sections: z.array(PublicSpaSectionSchema),
});
export type PublicPageResponse = z.infer<typeof PublicPageResponseSchema>;

export const PublicPageEnvelopeSchema = createApiResponseSchema(
  PublicPageResponseSchema,
);

// Auth DTO Schemas & Types
export const AdminRoleSchema = z.enum(["admin", "super_admin"]);
export type AdminRole = z.infer<typeof AdminRoleSchema>;

export const UserDtoSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  display_name: z.string(),
  role: AdminRoleSchema,
  is_active: z.boolean(),
  last_login_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type UserDto = z.infer<typeof UserDtoSchema>;

export const AuthTokensDtoSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  token_type: z.string(),
  expires_in: z.number().int(),
  user: UserDtoSchema,
});
export type AuthTokensDto = z.infer<typeof AuthTokensDtoSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const RefreshTokenResponseDtoSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  token_type: z.string(),
  expires_in: z.number().int(),
});
export type RefreshTokenResponseDto = z.infer<
  typeof RefreshTokenResponseDtoSchema
>;

export const RefreshTokenRequestSchema = z.object({
  refresh_token: z.string().min(1),
});
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;

export const LogoutRequestSchema = z.object({
  refresh_token: z.string().min(1),
});
export type LogoutRequest = z.infer<typeof LogoutRequestSchema>;

// Admin SpaSection DTO Schemas & Types
export const AdminSpaSectionDtoSchema = z.object({
  id: z.string().uuid(),
  key: z.string(),
  title: z.string(),
  navigation_label: z.string(),
  sort_order: z.number().int(),
  is_visible: z.boolean(),
  content_block_count: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type AdminSpaSectionDto = z.infer<typeof AdminSpaSectionDtoSchema>;

export const CreateSpaSectionRequestSchema = z.object({
  title: z.string().min(1),
  navigation_label: z.string().optional(),
});
export type CreateSpaSectionRequest = z.infer<
  typeof CreateSpaSectionRequestSchema
>;

export const UpdateSpaSectionRequestSchema = z.object({
  title: z.string().min(1).optional(),
  navigation_label: z.string().optional(),
  is_visible: z.boolean().optional(),
});
export type UpdateSpaSectionRequest = z.infer<
  typeof UpdateSpaSectionRequestSchema
>;

export const ReorderSpaSectionItemSchema = z.object({
  id: z.string().uuid(),
  sort_order: z.number().int(),
});

export const ReorderSpaSectionsRequestSchema = z.object({
  items: z.array(ReorderSpaSectionItemSchema),
});
export type ReorderSpaSectionsRequest = z.infer<
  typeof ReorderSpaSectionsRequestSchema
>;

// Admin Media Kind Schema
export const AdminMediaTypeSchema = z.enum(["image", "video", "youtube"]);
export type AdminMediaType = z.infer<typeof AdminMediaTypeSchema>;

// Admin ContentBlock DTO Schemas & Types
export const BlockAttachedMediaDtoSchema = z.object({
  id: z.string().uuid(),
  media_type: AdminMediaTypeSchema,
  storage_provider: z.string(),
  original_filename: z.string().nullable().optional(),
  stored_filename: z.string().nullable().optional(),
  mime_type: z.string().nullable().optional(),
  file_size: z.number().nullable().optional(),
  youtube_url: z.string().nullable().optional(),
  thumbnail_url: z.string().nullable().optional(),
});
export type BlockAttachedMediaDto = z.infer<typeof BlockAttachedMediaDtoSchema>;

export const AdminContentBlockDtoSchema = z.object({
  id: z.string().uuid(),
  spa_section_id: z.string().uuid(),
  section_key: z.string(),
  section_title: z.string(),
  block_type: ContentBlockTypeSchema,
  title: z.string().nullable().optional(),
  text: z.string(),
  media: BlockAttachedMediaDtoSchema.nullable().optional(),
  sort_order: z.number().int(),
  is_visible: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type AdminContentBlockDto = z.infer<typeof AdminContentBlockDtoSchema>;

export const CreateContentBlockRequestSchema = z.object({
  spa_section_id: z.string().uuid(),
  block_type: ContentBlockTypeSchema,
  title: z.string().optional(),
  text: z.string(),
  media_id: z.string().uuid().optional(),
  is_visible: z.boolean().optional(),
});
export type CreateContentBlockRequest = z.infer<
  typeof CreateContentBlockRequestSchema
>;

export const UpdateContentBlockRequestSchema = z.object({
  spa_section_id: z.string().uuid().optional(),
  block_type: ContentBlockTypeSchema.optional(),
  title: z.string().optional(),
  text: z.string().optional(),
  media_id: z.string().uuid().nullable().optional(),
  is_visible: z.boolean().optional(),
});
export type UpdateContentBlockRequest = z.infer<
  typeof UpdateContentBlockRequestSchema
>;

export const ReorderContentBlockItemSchema = z.object({
  id: z.string().uuid(),
  sort_order: z.number().int(),
});

export const ReorderContentBlocksRequestSchema = z.object({
  items: z.array(ReorderContentBlockItemSchema),
});
export type ReorderContentBlocksRequest = z.infer<
  typeof ReorderContentBlocksRequestSchema
>;

// Admin Media DTO Schemas & Types
export const AdminImageMediaSchema = z.object({
  type: z.literal("image"),
  id: z.string().uuid(),
  url: z.string(),
  original_filename: z.string().nullable().optional(),
  mime_type: z.string(),
  file_size: z.number().int(),
  alt_text: z.string().nullable().optional(),
  created_at: z.string(),
});
export type AdminImageMedia = z.infer<typeof AdminImageMediaSchema>;

export const AdminVideoMediaSchema = z.object({
  type: z.literal("video"),
  id: z.string().uuid(),
  url: z.string(),
  original_filename: z.string().nullable().optional(),
  mime_type: z.string(),
  file_size: z.number().int(),
  created_at: z.string(),
});
export type AdminVideoMedia = z.infer<typeof AdminVideoMediaSchema>;

export const AdminYoutubeMediaSchema = z.object({
  type: z.literal("youtube"),
  id: z.string().uuid(),
  youtube_video_id: z.string(),
  youtube_url: z.string(),
  embed_url: z.string(),
  thumbnail_url: z.string(),
  title: z.string().nullable().optional(),
  created_at: z.string(),
});
export type AdminYoutubeMedia = z.infer<typeof AdminYoutubeMediaSchema>;

export const AdminMediaDtoSchema = z.discriminatedUnion("type", [
  AdminImageMediaSchema,
  AdminVideoMediaSchema,
  AdminYoutubeMediaSchema,
]);
export type AdminMediaDto = z.infer<typeof AdminMediaDtoSchema>;

export const CreateYoutubeMediaRequestSchema = z.object({
  youtube_url: z.string().url(),
  title: z.string().optional(),
  caption: z.string().optional(),
  alt_text: z.string().optional(),
});
export type CreateYoutubeMediaRequest = z.infer<
  typeof CreateYoutubeMediaRequestSchema
>;
