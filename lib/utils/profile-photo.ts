import {
  PROFILE_PHOTO_MAX_BYTES,
  PROFILE_PHOTO_OPTIMIZATION,
} from "@/lib/config/profile-photo";
import { formatFileSize, optimizeImage } from "@/lib/utils/image-optimization";

export function parseSerialFromPhotoFilename(filename: string): number | null {
  const baseName = filename.replace(/\.[^/.]+$/, "").trim();
  if (!/^\d+$/.test(baseName)) return null;
  const serial = Number.parseInt(baseName, 10);
  return serial >= 1 ? serial : null;
}

export async function deleteUploadThingFile(
  fileKey: string | null | undefined,
): Promise<void> {
  if (!fileKey) return;

  try {
    const response = await fetch(
      `/api/uploadthing/delete?fileKey=${encodeURIComponent(fileKey)}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      throw new Error("Failed to delete file");
    }
  } catch (error) {
    console.error("Error deleting upload:", error);
  }
}

export async function prepareProfilePhotoFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file");
  }

  let quality = PROFILE_PHOTO_OPTIMIZATION.quality;
  let optimized = await optimizeImage(file, {
    ...PROFILE_PHOTO_OPTIMIZATION,
    quality,
  });

  while (optimized.size > PROFILE_PHOTO_MAX_BYTES && quality >= 0.45) {
    quality -= 0.08;
    optimized = await optimizeImage(optimized, {
      ...PROFILE_PHOTO_OPTIMIZATION,
      quality,
    });
  }

  if (optimized.size > PROFILE_PHOTO_MAX_BYTES) {
    throw new Error(
      `Photo must be 150 KB or less after compression (got ${formatFileSize(optimized.size)}). Try a smaller or simpler image.`,
    );
  }

  return optimized;
}
