/* eslint-disable @typescript-eslint/no-explicit-any */
export async function openImageWithProgress(
  file: File,
  onProgress: (pct: number) => void,
  fabric: any
): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = e => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        onProgress(pct);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const url = String(reader.result);
      fabric.Image.fromURL(
        url,
        (img: any) => resolve(img),
        { crossOrigin: 'anonymous' }
      );
    };
    reader.readAsDataURL(file);
  });
}
