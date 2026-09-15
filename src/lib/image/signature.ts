/**
 * Crop a signature canvas down to its drawn pixels (with a small
 * margin) and export it as a transparent-background PNG File, ready
 * for `uploadSignatureDirect`. Throws if nothing was drawn.
 */
export async function exportSignaturePng(
  canvas: HTMLCanvasElement,
): Promise<File> {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không xử lý được chữ ký");

  const { width, height } = canvas;
  const pixels = ctx.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] !== 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error("Chưa có nét ký nào");

  const margin = Math.round(8 * (window.devicePixelRatio || 1));
  minX = Math.max(0, minX - margin);
  minY = Math.max(0, minY - margin);
  maxX = Math.min(width - 1, maxX + margin);
  maxY = Math.min(height - 1, maxY + margin);

  const out = document.createElement("canvas");
  out.width = maxX - minX + 1;
  out.height = maxY - minY + 1;
  const outCtx = out.getContext("2d");
  if (!outCtx) throw new Error("Trình duyệt không xử lý được chữ ký");
  outCtx.drawImage(
    canvas,
    minX,
    minY,
    out.width,
    out.height,
    0,
    0,
    out.width,
    out.height,
  );

  const blob = await new Promise<Blob>((resolve, reject) =>
    out.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Không xuất được chữ ký"))),
      "image/png",
    ),
  );
  return new File([blob], "signature.png", { type: "image/png" });
}
