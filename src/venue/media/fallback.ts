/** A deliberate slate, never an uninitialised black texture. Retained on
 * network/codec failure and replaced in-place when the source becomes ready. */
export function mediaSlate(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createLinearGradient(0, 0, 1024, 512);
  gradient.addColorStop(0, "#1a2633"); gradient.addColorStop(1, "#070c13");
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1024, 512);
  ctx.strokeStyle = "#70808b"; ctx.lineWidth = 1;
  ctx.strokeRect(36, 36, 952, 440);
  ctx.textAlign = "center"; ctx.fillStyle = "#ffffff";
  ctx.font = "500 74px Arial"; ctx.fillText("LivegridAV", 512, 244);
  ctx.font = "400 20px Arial";
  ctx.fillText("IDEAS · CONTENT · EXPERIENCES", 512, 298);
  return canvas;
}
