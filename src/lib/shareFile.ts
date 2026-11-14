// Hand a file to the phone: its Share sheet (WhatsApp, Drive, email...) if it can share files, otherwise save it as a download.
export type ShareResult = 'shared' | 'saved' | 'cancelled';

// Share the file with the phone's Share sheet (WhatsApp, email, Drive...). A phone or computer that cannot share files saves it instead.
export async function shareOrSave(bytes: Uint8Array, filename: string, mime: string, title: string): Promise<ShareResult> {
  const file = new File([bytes as BlobPart], filename, { type: mime });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
      // any other failure: fall through and save it
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'saved';
}

