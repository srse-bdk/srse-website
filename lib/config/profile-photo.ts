/** Maximum profile photo file size (150 KB). Used for ID cards and avatars. */
export const PROFILE_PHOTO_MAX_BYTES = 150 * 1024;

export const PROFILE_PHOTO_MAX_SIZE_MB = PROFILE_PHOTO_MAX_BYTES / (1024 * 1024);

/** Target pixel size — enough for 30 mm ID card photo at print scale. */
export const PROFILE_PHOTO_MAX_DIMENSION = 400;

export const PROFILE_PHOTO_OPTIMIZATION = {
  maxSizeMB: PROFILE_PHOTO_MAX_SIZE_MB,
  maxWidthOrHeight: PROFILE_PHOTO_MAX_DIMENSION,
  quality: 0.82,
  convertToWebP: true,
} as const;
