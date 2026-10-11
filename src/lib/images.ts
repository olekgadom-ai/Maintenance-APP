// Phone photos are 3–8 MB; the shop floor Wi-Fi is not. Downscale before upload.
export async function downscaleImage(
  file: File,
  maxDimension = 1600,
  quality = 0.8,
): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      1,
      maxDimension / Math.max(bitmap.width, bitmap.height),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas
      .getContext("2d")!
      .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", {
      type: "image/jpeg",
    });
  } catch {
    // Formats the browser cannot decode (e.g. HEIC outside Safari) go up as they are.
    return file;
  }
}
