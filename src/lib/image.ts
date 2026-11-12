// A product picture. The shopkeeper picks or takes a photo; it is shrunk to a small JPEG so it stays light on a
// cheap phone, uploads fast on a weak connection, and fits the database limit (see products.image).
export const MAX_IMAGE_CHARS = 60_000;

// Returns a small "data:image/jpeg" address, or null when the file is not a picture this phone can read
export async function compressImage(file: File, max = 256): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    // Lower the quality a step at a time until it is small enough
    for (let quality = 0.7; quality >= 0.3; quality -= 0.1) {
      const url = canvas.toDataURL('image/jpeg', quality);
      if (url.length <= MAX_IMAGE_CHARS - 2_000) return url;
    }
    return null;
  } catch {
    return null;
  }
}
