// Reads the text of a photo (a handwritten or printed price list) on the phone itself, with the free Tesseract engine.
// The photo never leaves the phone. Only the engine and its English letter data are downloaded the first time
// (about 10 MB, then kept by the browser); this code is loaded only when the person taps "photo of list".

const MAX_SIDE = 2000;

// Big camera photos are made smaller first: faster, and the reading is just as good
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    if (scale === 1) {
      bmp.close();
      return file;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    return await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.9));
  } catch {
    return file;
  }
}

export async function readPhotoText(file: File, onProgress: (percent: number) => void): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') onProgress(Math.round(m.progress * 100));
    },
  });
  try {
    const { data } = await worker.recognize(await shrink(file));
    return data.text;
  } finally {
    await worker.terminate();
  }
}
