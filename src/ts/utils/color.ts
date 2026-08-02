import { isStr } from "@t007/utils";
import { createEl } from "@utils/dom";
import { clamp } from "@utils/num";

// Types
type RGB = [number, number, number];

// RGB Analysis
export function getRGBBri([r, g, b]: RGB): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function getRGBSat([r, g, b]: RGB): number {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

export function clampRGBBri([r, g, b]: RGB, m = 40): RGB {
  const br = getRGBBri([r, g, b]),
    d = br < m ? m - br : br > 255 - m ? -(br - (255 - m)) : 0;
  return [r + d, g + d, b + d].map((v) => clamp(0, v << 0, 255)) as RGB;
}

// Dominant Color Detection
export async function getDominantColor(src: string | HTMLImageElement | HTMLCanvasElement | { canvas: HTMLCanvasElement; width: number; height: number }, format: "hex", raw?: false): Promise<string | null>;
export async function getDominantColor(src: string | HTMLImageElement | HTMLCanvasElement | { canvas: HTMLCanvasElement; width: number; height: number }, format: "rgb", raw: true): Promise<RGB | null>;
export async function getDominantColor(src: string | HTMLImageElement | HTMLCanvasElement | { canvas: HTMLCanvasElement; width: number; height: number }, format?: "rgb", raw?: false): Promise<string | null>;
export async function getDominantColor(src: string | HTMLImageElement | HTMLCanvasElement | { canvas: HTMLCanvasElement; width: number; height: number }, format: "rgb" | "hex" = "hex", raw = false): Promise<string | RGB | null> {
  if (isStr(src))
    src = await new Promise<HTMLImageElement>((res, rej) => {
      const i = createEl("img", { crossOrigin: "anonymous", src: String(src), onload: () => res(i), onerror: () => rej(new Error(`Image load error: ${src}`)) });
    });
  if ((src as { canvas?: HTMLCanvasElement })?.canvas) src = (src as { canvas: HTMLCanvasElement }).canvas;
  const s = Math.min(64, (src as HTMLImageElement | HTMLCanvasElement).width, (src as HTMLImageElement | HTMLCanvasElement).height),
    c = createEl("canvas", { width: s, height: s }),
    x = c.getContext("2d", { willReadFrequently: true, alpha: false });
  let d: Uint8ClampedArray | null | undefined = null;
  try {
    d = src?.width && src?.height ? (x?.drawImage(src as CanvasImageSource, 0, 0, s, s), x?.getImageData(0, 0, s, s).data as Uint8ClampedArray) : null;
  } catch (e) {}
  const ct: Record<string, number> = {},
    pt: Record<string, RGB> = {} as Record<string, RGB>;
  for (let i = 0; i < (d?.length ?? 0); i += 4) {
    if (d![i + 3] < 128) continue;
    const r = d![i] & 0xf0,
      g = d![i + 1] & 0xf0,
      b = d![i + 2] & 0xf0; // Optimized bitwise extraction
    const k = (r << 16) | (g << 8) | b;
    ct[k] = (ct[k] || 0) + 1;
    pt[k] = pt[k] ? [pt[k][0] + d![i], pt[k][1] + d![i + 1], pt[k][2] + d![i + 2]] : [d![i], d![i + 1], d![i + 2]];
  }
  const clrs = Object.keys(ct)
    .sort((a, b) => ct[b] - ct[a])
    .slice(0, 7)
    .map((k) => ({ key: k, rgb: pt[k].map((v) => Math.round(v / ct[k])) as RGB }));
  if (!clrs.length) return null;
  const [r, g, b] = clampRGBBri(clrs.reduce((sat, curr) => (getRGBSat(sat.rgb) > getRGBSat(curr.rgb) ? sat : curr), clrs[0]).rgb, 70);
  return format === "hex" ? `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}` : raw == false ? `rgb(${r},${g},${b})` : [r, g, b];
}

export function convertToMonoChrome(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): void {
  const frame = context.getImageData(0, 0, canvas.width || 1, canvas.height || 1);
  for (let i = 0; i < frame.data.length / 4; i++) {
    const grey = (frame.data[i * 4 + 0] + frame.data[i * 4 + 1] + frame.data[i * 4 + 2]) / 3;
    (frame.data[i * 4 + 0] = grey), (frame.data[i * 4 + 1] = grey), (frame.data[i * 4 + 2] = grey);
  }
  context.putImageData(frame, 0, 0);
}
