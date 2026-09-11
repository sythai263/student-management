export function drawDuck(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  name: string,
  scale: number,
  image: HTMLImageElement,
) {
  const duckFont = Math.min(Math.max(scale * 11, 9), 12);
  const w = 36 * scale;
  let h = 32 * scale;
  let cx = x + w / 2;

  if (image.complete && image.naturalWidth > 0) {
    h = (image.height / image.width) * w;
    const top = y - h / 2;
    ctx.drawImage(image, x, top, w, h);
    cx = x + w / 2;
  }

  ctx.font = `${duckFont}px sans-serif`;
  const metrics = ctx.measureText(name);
  const textW = metrics.width;
  const nameY = y - h / 2 - 4;
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillRect(cx - textW / 2 - 3, nameY - duckFont - 3, textW + 6, duckFont + 6);
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(name, cx, nameY);
}
