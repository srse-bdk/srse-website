export async function fetchImageUrlAsFile(
  url: string,
  filename = "photo.jpg",
): Promise<File> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to load image");
  }

  const blob = await response.blob();
  const type = blob.type || "image/jpeg";
  const extension = type.split("/")[1] || "jpg";

  return new File([blob], filename.replace(/\.[^/.]+$/, "") + `.${extension}`, {
    type,
  });
}
