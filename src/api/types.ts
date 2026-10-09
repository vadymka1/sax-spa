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

export const CONTENT_BLOCK_TYPE_VALUES = [
  "text",
  "text_image",
  "text_video",
  "text_youtube",
] as const;
export const ContentBlockTypeSchema = z.enum(CONTENT_BLOCK_TYPE_VALUES);
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

export const FONT_FAMILY_VALUES = ["sans", "serif", "display", "mono"] as const;
export const FontFamilySchema = z.enum(FONT_FAMILY_VALUES);
export type FontFamily = z.infer<typeof FontFamilySchema>;

export const FONT_SIZE_VALUES = ["sm", "md", "lg", "xl", "2xl"] as const;
export const FontSizeSchema = z.enum(FONT_SIZE_VALUES);
export type FontSize = z.infer<typeof FontSizeSchema>;

export const PublicContentBlockSchema = z.object({
  id: z.string().uuid(),
  block_type: ContentBlockTypeSchema,
  title: z.string().nullable().optional(),
  text: z.string(),
  media: z.preprocess(
    (val) => {
      if (val === null || val === undefined) return null;
      if (Array.isArray(val)) return val;
      return [val];
    },
    z.union([z.array(PublicMediaSchema), PublicMediaSchema, z.null()]),
  ),
  font_family: FontFamilySchema.nullable().optional(),
  font_size: FontSizeSchema.nullable().optional(),
  sort_order: z.number().int().optional(),
});
export type PublicContentBlock = z.infer<typeof PublicContentBlockSchema>;

export const PublicSpaSectionSchema = z.object({
  id: z.string().uuid(),
  key: z.string(),
  title: z.string(),
  name: z.string().optional(),
  navigation_label: z.string(),
  sort_order: z.number().int(),
  blocks: z.array(PublicContentBlockSchema),
});
export type PublicSpaSection = z.infer<typeof PublicSpaSectionSchema>;

export const PublicTestimonialSchema = z.object({
  id: z.string().uuid(),
  author_name: z.string(),
  author_role: z.string().nullable().optional(),
  text: z.string(),
  avatar: PublicMediaSchema.nullable().optional(),
  sort_order: z.number().int(),
});
export type PublicTestimonial = z.infer<typeof PublicTestimonialSchema>;
export const BACKGROUND_POSITION_VALUES = ["center", "top", "bottom"] as const;
export const BackgroundPositionSchema = z.enum(BACKGROUND_POSITION_VALUES);
export type BackgroundPosition = z.infer<typeof BackgroundPositionSchema>;

export const BACKGROUND_SIZE_VALUES = ["cover", "contain"] as const;
export const BackgroundSizeSchema = z.enum(BACKGROUND_SIZE_VALUES);
export type BackgroundSize = z.infer<typeof BackgroundSizeSchema>;

export const BACKGROUND_MODE_VALUES = ["none", "color", "image"] as const;
export const BackgroundModeSchema = z.enum(BACKGROUND_MODE_VALUES);
export type BackgroundMode = z.infer<typeof BackgroundModeSchema>;

export const BackgroundColorSchema = z
  .string()
  .regex(/^#[0-9A-F]{6}$/, "Must be canonical hex color #RRGGBB");
export type BackgroundColor = z.infer<typeof BackgroundColorSchema>;

export const PageAppearanceMediaSchema = z
  .object({
    id: z.string().uuid(),
    type: z.literal("image"),
    url: z.string(),
    alt_text: z.string().nullable().optional(),
  })
  .strict();
export type PageAppearanceMedia = z.infer<typeof PageAppearanceMediaSchema>;

export const PublicPageAppearanceDtoSchema = z.object({
  background_mode: BackgroundModeSchema,
  background_color: BackgroundColorSchema,
  background_media: PageAppearanceMediaSchema.nullable(),
  overlay_opacity: z.number().min(0).max(1),
  background_position: BackgroundPositionSchema,
  background_size: BackgroundSizeSchema,
});
export type PublicPageAppearanceDto = z.infer<
  typeof PublicPageAppearanceDtoSchema
>;

export const PublicPageResponseSchema = z.object({
  page: PublicPageSchema,
  appearance: PublicPageAppearanceDtoSchema,
  sections: z.array(PublicSpaSectionSchema),
  testimonials: z.array(PublicTestimonialSchema),
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

export const AuthResponseDtoSchema = z
  .object({
    access_token: z.string().min(1),
    token_type: z.string(),
    expires_in: z.number().int(),
    user: UserDtoSchema,
  })
  .strict();
export type AuthResponseDto = z.infer<typeof AuthResponseDtoSchema>;

export const LoginResponseDtoSchema = AuthResponseDtoSchema;
export type LoginResponseDto = AuthResponseDto;

export const RefreshResponseDtoSchema = AuthResponseDtoSchema;
export type RefreshResponseDto = AuthResponseDto;

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const PASSWORD_MIN_LENGTH = 6;

export const CreateUserRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(
      PASSWORD_MIN_LENGTH,
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    ),
  display_name: z.string().min(1, "Display name is required"),
  role: AdminRoleSchema,
  is_active: z.boolean().optional(),
});
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

export const UpdateUserRequestSchema = z.object({
  email: z.string().email("Invalid email address").optional(),
  display_name: z.string().min(1, "Display name is required").optional(),
  role: AdminRoleSchema.optional(),
  is_active: z.boolean().optional(),
});
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;

// Admin SpaSection DTO Schemas & Types
export const SpaSectionTranslationDtoSchema = z.object({
  name: z.string(),
  navigation_label: z.string().nullable().optional(),
});
export type SpaSectionTranslationDto = z.infer<
  typeof SpaSectionTranslationDtoSchema
>;

export const SpaSectionTranslationsDtoSchema = z.object({
  en: SpaSectionTranslationDtoSchema,
  de: SpaSectionTranslationDtoSchema.nullable().optional(),
});
export type SpaSectionTranslationsDto = z.infer<
  typeof SpaSectionTranslationsDtoSchema
>;

export const AdminSpaSectionDtoSchema = z.object({
  id: z.string().uuid(),
  key: z.string(),
  title: z.string(),
  name: z.string().optional(),
  navigation_label: z.string().nullable().optional(),
  sort_order: z.number().int(),
  is_visible: z.boolean(),
  content_block_count: z.number().int().optional().default(0),
  translations: SpaSectionTranslationsDtoSchema.nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type AdminSpaSectionDto = z.infer<typeof AdminSpaSectionDtoSchema>;

export const CreateSpaSectionTranslationSchema = z.object({
  name: z.string().min(1),
  navigation_label: z.string().nullable().optional(),
});
export type CreateSpaSectionTranslation = z.infer<
  typeof CreateSpaSectionTranslationSchema
>;

export const CreateSpaSectionTranslationsSchema = z.object({
  en: CreateSpaSectionTranslationSchema,
  de: CreateSpaSectionTranslationSchema.nullable().optional(),
});
export type CreateSpaSectionTranslations = z.infer<
  typeof CreateSpaSectionTranslationsSchema
>;

export const CreateSpaSectionRequestSchema = z.object({
  title: z.string().min(1).optional(),
  name: z.string().optional(),
  navigation_label: z.string().optional(),
  translations: CreateSpaSectionTranslationsSchema.optional(),
});
export type CreateSpaSectionRequest = z.infer<
  typeof CreateSpaSectionRequestSchema
>;

export const UpdateSpaSectionTranslationSchema = z.object({
  name: z.string().min(1).optional(),
  navigation_label: z.string().nullable().optional(),
});
export type UpdateSpaSectionTranslation = z.infer<
  typeof UpdateSpaSectionTranslationSchema
>;

export const UpdateSpaSectionTranslationsSchema = z.object({
  en: UpdateSpaSectionTranslationSchema.optional(),
  de: UpdateSpaSectionTranslationSchema.nullable().optional(),
});
export type UpdateSpaSectionTranslations = z.infer<
  typeof UpdateSpaSectionTranslationsSchema
>;

export const UpdateSpaSectionRequestSchema = z.object({
  title: z.string().min(1).optional(),
  name: z.string().optional(),
  navigation_label: z.string().nullable().optional(),
  is_visible: z.boolean().optional(),
  translations: UpdateSpaSectionTranslationsSchema.optional(),
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
export const ContentBlockTranslationDtoSchema = z.object({
  title: z.string().nullable().optional(),
  text: z.string(),
});
export type ContentBlockTranslationDto = z.infer<
  typeof ContentBlockTranslationDtoSchema
>;

export const ContentBlockTranslationsDtoSchema = z.object({
  en: ContentBlockTranslationDtoSchema,
  de: ContentBlockTranslationDtoSchema.nullable().optional(),
});
export type ContentBlockTranslationsDto = z.infer<
  typeof ContentBlockTranslationsDtoSchema
>;

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
  section_title: z.string().optional(),
  section_name: z.string().optional(),
  block_type: ContentBlockTypeSchema,
  title: z.string().nullable().optional(),
  text: z.string(),
  translations: ContentBlockTranslationsDtoSchema.nullable().optional(),
  media: z.preprocess(
    (val) => {
      if (val === null || val === undefined) return null;
      if (Array.isArray(val)) return val;
      return [val];
    },
    z.union([
      z.array(BlockAttachedMediaDtoSchema),
      BlockAttachedMediaDtoSchema,
      z.null(),
    ]),
  ),
  font_family: FontFamilySchema.nullable().optional(),
  font_size: FontSizeSchema.nullable().optional(),
  sort_order: z.number().int(),
  is_visible: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type AdminContentBlockDto = z.infer<typeof AdminContentBlockDtoSchema>;

export const CreateContentBlockTranslationSchema = z.object({
  title: z.string().optional(),
  text: z.string().min(1),
});
export type CreateContentBlockTranslation = z.infer<
  typeof CreateContentBlockTranslationSchema
>;

export const CreateContentBlockTranslationsSchema = z.object({
  en: CreateContentBlockTranslationSchema,
  de: CreateContentBlockTranslationSchema.nullable().optional(),
});
export type CreateContentBlockTranslations = z.infer<
  typeof CreateContentBlockTranslationsSchema
>;

export const CreateContentBlockRequestSchema = z.object({
  spa_section_id: z.string().uuid(),
  block_type: ContentBlockTypeSchema,
  title: z.string().optional(),
  text: z.string().optional(),
  translations: CreateContentBlockTranslationsSchema.optional(),
  media_id: z.string().uuid().optional(),
  media_ids: z.array(z.string().uuid()).optional(),
  font_family: FontFamilySchema.optional(),
  font_size: FontSizeSchema.optional(),
  is_visible: z.boolean().optional(),
});
export type CreateContentBlockRequest = z.infer<
  typeof CreateContentBlockRequestSchema
>;

export const UpdateContentBlockTranslationSchema = z.object({
  title: z.string().nullable().optional(),
  text: z.string().min(1).optional(),
});
export type UpdateContentBlockTranslation = z.infer<
  typeof UpdateContentBlockTranslationSchema
>;

export const UpdateContentBlockTranslationsSchema = z.object({
  en: UpdateContentBlockTranslationSchema.optional(),
  de: UpdateContentBlockTranslationSchema.nullable().optional(),
});
export type UpdateContentBlockTranslations = z.infer<
  typeof UpdateContentBlockTranslationsSchema
>;

export const UpdateContentBlockRequestSchema = z.object({
  spa_section_id: z.string().uuid().optional(),
  block_type: ContentBlockTypeSchema.optional(),
  title: z.string().optional(),
  text: z.string().optional(),
  translations: UpdateContentBlockTranslationsSchema.optional(),
  media_id: z.string().uuid().nullable().optional(),
  media_ids: z.array(z.string().uuid()).optional(),
  font_family: FontFamilySchema.optional(),
  font_size: FontSizeSchema.optional(),
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

// Public Contact Form Schemas & Types
export const ContactRequestSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  email: z
    .string()
    .email("Invalid email address")
    .max(255, "Email is too long"),
  subject: z.string().max(200, "Subject is too long").optional(),
  message: z
    .string()
    .min(1, "Message is required")
    .max(5000, "Message is too long"),
});
export type ContactRequest = z.infer<typeof ContactRequestSchema>;

export const ContactResponseSchema = z.object({
  id: z.string().uuid().optional(),
  message: z.string().optional(),
  status: z.string().optional(),
});
export type ContactResponse = z.infer<typeof ContactResponseSchema>;

// Admin Contact Message Schemas & Types
export const ContactEmailStatusSchema = z.enum([
  "pending",
  "sent",
  "failed",
  "disabled",
]);
export type ContactEmailStatus = z.infer<typeof ContactEmailStatusSchema>;

export const AdminContactMessageDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string(),
  subject: z.string().nullable().optional(),
  message: z.string(),

  email_status: ContactEmailStatusSchema,
  email_error: z.string().nullable().optional(),
  email_sent_at: z.string().nullable().optional(),

  is_read: z.boolean(),
  read_at: z.string().nullable().optional(),

  created_at: z.string(),
  updated_at: z.string(),
});
export type AdminContactMessageDto = z.infer<
  typeof AdminContactMessageDtoSchema
>;

// Public Review Submission Schemas & Types
export const CreatePublicTestimonialRequestSchema = z.object({
  author_name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(120, "Name must not exceed 120 characters"),
  author_role: z
    .string()
    .trim()
    .max(160, "Role/company must not exceed 160 characters")
    .optional(),
  text: z
    .string()
    .trim()
    .min(1, "Review is required")
    .max(3000, "Review must not exceed 3000 characters"),
});
export type CreatePublicTestimonialRequest = z.infer<
  typeof CreatePublicTestimonialRequestSchema
>;

export const PublicTestimonialSubmissionResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.literal("pending"),
});
export type PublicTestimonialSubmissionResponse = z.infer<
  typeof PublicTestimonialSubmissionResponseSchema
>;

// Admin Testimonials DTO Schemas & Types
export const TestimonialModerationStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
]);
export type TestimonialModerationStatus = z.infer<
  typeof TestimonialModerationStatusSchema
>;

export const TestimonialSubmissionSourceSchema = z.enum(["admin", "public"]);
export type TestimonialSubmissionSource = z.infer<
  typeof TestimonialSubmissionSourceSchema
>;

export const AdminTestimonialDtoSchema = z.object({
  id: z.string().uuid(),
  author_name: z.string(),
  author_role: z.string().nullable().optional(),
  text: z.string(),
  avatar: AdminMediaDtoSchema.nullable().optional(),
  sort_order: z.number().int(),
  is_visible: z.boolean(),
  moderation_status: TestimonialModerationStatusSchema,
  submission_source: TestimonialSubmissionSourceSchema,
  created_at: z.string(),
  updated_at: z.string(),
});
export type AdminTestimonialDto = z.infer<typeof AdminTestimonialDtoSchema>;
export type AdminTestimonial = AdminTestimonialDto;

export const CreateTestimonialRequestSchema = z.object({
  author_name: z
    .string()
    .trim()
    .min(1, "Author name is required")
    .max(120, "Author name must not exceed 120 characters"),
  author_role: z
    .string()
    .trim()
    .max(160, "Author role must not exceed 160 characters")
    .nullable()
    .optional(),
  text: z
    .string()
    .trim()
    .min(1, "Review text is required")
    .max(3000, "Review text must not exceed 3000 characters"),
  avatar_media_id: z.string().uuid().nullable().optional(),
  is_visible: z.boolean(),
});
export type CreateTestimonialRequest = z.infer<
  typeof CreateTestimonialRequestSchema
>;

export const UpdateTestimonialRequestSchema = z.object({
  author_name: z
    .string()
    .trim()
    .min(1, "Author name is required")
    .max(120, "Author name must not exceed 120 characters")
    .optional(),
  author_role: z
    .string()
    .trim()
    .max(160, "Author role must not exceed 160 characters")
    .nullable()
    .optional(),
  text: z
    .string()
    .trim()
    .min(1, "Review text is required")
    .max(3000, "Review text must not exceed 3000 characters")
    .optional(),
  avatar_media_id: z.string().uuid().nullable().optional(),
  is_visible: z.boolean().optional(),
});
export type UpdateTestimonialRequest = z.infer<
  typeof UpdateTestimonialRequestSchema
>;

export const ReorderTestimonialItemSchema = z.object({
  id: z.string().uuid(),
  sort_order: z.number().int(),
});
export type ReorderTestimonialItem = z.infer<
  typeof ReorderTestimonialItemSchema
>;

export const ReorderTestimonialsRequestSchema = z.object({
  items: z.array(ReorderTestimonialItemSchema),
});
export type ReorderTestimonialsRequest = z.infer<
  typeof ReorderTestimonialsRequestSchema
>;

export type PublicMediaDto = PublicMedia;

// Admin Page Appearance DTO Schemas & Types
export const AdminPageAppearanceDtoSchema = z.object({
  background_mode: BackgroundModeSchema,
  background_color: BackgroundColorSchema,
  background_media: PageAppearanceMediaSchema.nullable(),
  overlay_opacity: z.number().min(0).max(1),
  background_position: BackgroundPositionSchema,
  background_size: BackgroundSizeSchema,
});
export type AdminPageAppearanceDto = z.infer<
  typeof AdminPageAppearanceDtoSchema
>;
export type PageAppearance = AdminPageAppearanceDto;

export const UpdatePageAppearanceRequestSchema = z.object({
  background_mode: BackgroundModeSchema.optional(),
  background_color: BackgroundColorSchema.optional(),
  background_media_id: z.string().uuid().nullable().optional(),
  overlay_opacity: z.number().min(0).max(1).optional(),
  background_position: BackgroundPositionSchema.optional(),
  background_size: BackgroundSizeSchema.optional(),
});
export type UpdatePageAppearanceRequest = z.infer<
  typeof UpdatePageAppearanceRequestSchema
>;
