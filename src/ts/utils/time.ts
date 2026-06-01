import { isNum } from "@t007/utils";

// Media Time Formatting
export function formatMediaTime({ time, format = "digital", elapsed = true, showMs = false, casing = "normal" }: { time?: number; format?: string; elapsed?: boolean; showMs?: boolean; casing?: "normal" | "upper" | "title" } = { time: 0 }): string {
  const long = format.endsWith("long"),
    sx = (n = 0) => (n == 1 ? "" : "s"),
    cs = (str: string) => (casing === "upper" ? str.toUpperCase() : casing === "title" ? str.replace(/^([a-z])/i, (m) => m.toUpperCase()) : str.toLowerCase()),
    wrd = (n = 0) => ({ h: cs(long ? " hour" + sx(n) + " " : "h"), m: cs(long ? " minute" + sx(n) + " " : "m"), s: cs(long ? " second" + sx(n) + " " : "s"), ms: cs(long ? " millisecond" + sx(n) + " " : "ms") }),
    pad = (v: string | number, n = 2, f?: boolean) => (long && !f ? v : String(v).padStart(n, isNum(+n) ? "0" : "-"));
  if (isNaN(time ?? NaN) || time === Infinity) return format !== "digital" ? ("-" + wrd().h + pad("-") + wrd().m + (!elapsed ? "left" : "")).trim() : !elapsed ? "--:--" : "-:--";
  const s = Math.floor(Math.abs(time!) % 60),
    m = Math.floor(Math.abs(time!) / 60) % 60,
    h = Math.floor(Math.abs(time!) / 3600),
    ms = Math.floor((Math.abs(time!) % 1) * 1000); // returns early so "!"
  if (format === "digital") {
    const base = h ? h + ":" + pad(m, 2, true) + ":" + pad(s, 2, true) : m + ":" + pad(s, 2, true);
    return !elapsed ? "-" + base : base;
  }
  const base = h ? h + wrd(h).h + pad(m) + wrd(m).m + pad(s) + wrd(s).s : m + wrd(m).m + pad(s) + wrd(s).s,
    msPart = showMs && ms ? pad(ms, 3) + wrd(ms).ms : "";
  return (base + msPart + (!long ? " " : "") + (!elapsed ? "left" : "")).trim();
}

// Time Ranges
export interface TimeRange {
  length: number;
  start(index: number): number;
  end(index: number): number;
}

export function createTimeRanges(ranges?: [number, number][] | TimeRange): TimeRange {
  if (!ranges || (ranges as TimeRange).length !== undefined) return (ranges as TimeRange) || { length: 0, start: () => 0, end: () => 0 };
  const pairs = (ranges as [number, number][]).sort((a, b) => a[0] - b[0]);
  return {
    length: pairs.length,
    start: (i: number) => (pairs[i] ? pairs[i][0] : 0),
    end: (i: number) => (pairs[i] ? pairs[i][1] : 0),
  };
}
