export function drawDuck(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  name: string,
  scale: number,
  image: HTMLImageElement,
  tilt = 0,
) {
  const duckFont = Math.min(Math.max(scale * 11, 9), 12);
  const w = 36 * scale;
  let h = 32 * scale;
  let cx = x + w / 2;

  if (image.complete && image.naturalWidth > 0) {
    h = (image.height / image.width) * w;
    // Rotate around the duck's centre — wobbles while running.
    ctx.save();
    ctx.translate(cx, y);
    ctx.rotate(tilt);
    ctx.drawImage(image, -w / 2, -h / 2, w, h);
    ctx.restore();
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
