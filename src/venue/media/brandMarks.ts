/** Canvas versions of the livegridAV brand marks: the 5x5 signal grid and the
 * `livegrid` + aqua `AV` wordmark. Every screen and canvas texture uses these. */

export const SIGNAL_GRID_HEIGHTS = [2, 4, 3, 5, 4] as const;

const AQUA = "#1FA093";
const UNLIT = "#0e1a18";
// Artwork ratios: 48 cell, 57 pitch, 276 overall (4 * 57 + 48).
const CELL = 48, PITCH = 57, TOTAL = 276;

/** 25 cells, row 0 at the top. Column c is lit for its bottom SIGNAL_GRID_HEIGHTS[c] rows. */
export function signalGridCells(): { col: number; row: number; lit: boolean }[] {
  const cells: { col: number; row: number; lit: boolean }[] = [];
  for (let row = 0; row < 5; row++)
    for (let col = 0; col < 5; col++)
      cells.push({ col, row, lit: row >= 5 - SIGNAL_GRID_HEIGHTS[col] });
  return cells;
}

/** Draws the grid in a `size` x `size` box whose top-left corner is (x, y). */
export function drawSignalGrid(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const k = size / TOTAL;
  ctx.save();
  for (const { col, row, lit } of signalGridCells()) {
    ctx.fillStyle = lit ? AQUA : UNLIT;
    ctx.fillRect(x + col * PITCH * k, y + row * PITCH * k, CELL * k, CELL * k);
  }
  ctx.restore();
}

function family() {
  if (typeof document === "undefined") return 'Arial, "Segoe UI", sans-serif';
  const font = getComputedStyle(document.documentElement).getPropertyValue("--font-space-grotesk").trim();
  return font ? `${font}, Arial, sans-serif` : 'Arial, "Segoe UI", sans-serif';
}

/** Draws `livegrid` then aqua `AV`, vertically centred on y. x is the left, centre or
 * right edge depending on `align` (default left). `maxWidth` shrinks the font to fit. Honours the context's letterSpacing.
 * Returns the total width. */
export function drawWordmark(
  ctx: CanvasRenderingContext2D, x: number, y: number, fontPx: number,
  opts: { align?: CanvasTextAlign; ink?: string; maxWidth?: number } = {},
): number {
  const { align = "left", ink = "#f8fcff", maxWidth } = opts;
  ctx.save();
  const face = family();
  ctx.font = `600 ${fontPx}px ${face}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  let total = ctx.measureText("livegridAV").width;
  if (maxWidth !== undefined && total > maxWidth) {
    // Scale the font down uniformly so the whole wordmark fits.
    ctx.font = `600 ${fontPx * maxWidth / total}px ${face}`;
    total = ctx.measureText("livegridAV").width;
  }
  const first = ctx.measureText("livegrid").width;
  const start = align === "center" ? x - total / 2 : align === "right" || align === "end" ? x - total : x;
  ctx.fillStyle = ink;
  ctx.fillText("livegrid", start, y);
  ctx.fillStyle = AQUA;
  ctx.fillText("AV", start + first, y);
  ctx.restore();
  return total;
}
