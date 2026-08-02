import { isNum } from "@t007/utils";

// Media Time Formatting
export function formatMediaTime({ time, format = "digital", elapsed = true, showMs = false, casing = "normal" }: { time?: number; format?: string; elapsed?: boolean; showMs?: boolean; casing?: "normal" | "upper" | "title" } = { time: 0 }): string {
  const long = format.endsWith("long"),
    sx = (n = 0) => (n == 1 ? "" : "s"),
    cs = (str: string) => (casing === "upper" ? str.toUpperCase() : casing === "title" ? str.replace(/^([a-z])/i, (m) => m.toUpperCase()) : str.toLowerCase()),
    wrd = (n = 0) => ({ d: cs(long ? " day" + sx(n) + " " : "d"), h: cs(long ? " hour" + sx(n) + " " : "h"), m: cs(long ? " minute" + sx(n) + " " : "m"), s: cs(long ? " second" + sx(n) + " " : "s"), ms: cs(long ? " millisecond" + sx(n) + " " : "ms") }),
    pad = (v: string | number, n = 2, f?: boolean) => (long && !f ? v : String(v).padStart(n, isNum(+n) ? "0" : "-"));
  if (isNaN(time ?? NaN) || time === Infinity) return format !== "digital" ? ("-" + wrd().h + pad("-") + wrd().m + (!elapsed ? "left" : "")).trim() : !elapsed ? "-:--" : "-:--";
  const s = Math.floor(Math.abs(time!) % 60),
    m = Math.floor(Math.abs(time!) / 60) % 60,
    h = Math.floor(Math.abs(time!) / 3600) % 24,
    d = Math.floor(Math.abs(time!) / 86400),
    ms = Math.floor((Math.abs(time!) % 1) * 1000); // returns early so "!"
  if (format === "digital") {
    const base = d ? d + ":" + pad(h, 2, true) + ":" + pad(m, 2, true) + ":" + pad(s, 2, true) : h ? h + ":" + pad(m, 2, true) + ":" + pad(s, 2, true) : m + ":" + pad(s, 2, true);
    return !elapsed ? "-" + base : base;
  }
  const base = d ? d + wrd(d).d + pad(h) + wrd(h).h + pad(m) + wrd(m).m + pad(s) + wrd(s).s : h ? h + wrd(h).h + pad(m) + wrd(m).m + pad(s) + wrd(s).s : m + wrd(m).m + pad(s) + wrd(s).s,
    msPart = showMs && ms ? pad(ms, 3) + wrd(ms).ms : "";
  return (base + msPart + (!long ? " " : "") + (!elapsed ? "left" : "")).trim();
}

export function formatMenuMs(ms?: number | boolean): string {
  if (ms === true || ms == null || ms === 0) return ms === 0 ? "0 secs" : "Auto";
  if (ms === false || ms === -1) return "Off";
  if (ms < 1000 && ms > 0) return `${ms} ms`;
  const time = ms / 1000,
    s = Math.floor(Math.abs(time) % 60),
    m = Math.floor(Math.abs(time) / 60) % 60,
    h = Math.floor(Math.abs(time) / 3600) % 24,
    d = Math.floor(Math.abs(time) / 86400);
  let res = "";
  if (d > 0) res += `${d} day${d > 1 ? "s" : ""} `;
  if (h > 0) res += `${h} hr${h > 1 ? "s" : ""} `;
  if (m > 0) res += `${m} min${m > 1 ? "s" : ""} `;
  if (s > 0 || (ms % 1000 > 0 && !res)) res += `${s}${ms % 1000 > 0 ? `.${Math.floor((ms % 1000) / 100)}` : ""} sec${s > 1 ? "s" : ""} `;
  return res.trim();
}

// Time Ranges

export function createTimeRanges(ranges?: [number, number][] | TimeRanges | ArrayLike<any>): TimeRanges {
  if (ranges instanceof TimeRanges) return ranges;
  if (!ranges)
    return Object.create(TimeRanges.prototype, {
      length: { value: 0 },
      start: {
        value: () => {
          throw new DOMException("Index out of bounds", "IndexSizeError");
        },
      },
      end: {
        value: () => {
          throw new DOMException("Index out of bounds", "IndexSizeError");
        },
      },
    });
  // 1. Sort incoming intervals chronologically by start time
  const rawPairs = (Array.isArray(ranges) ? ranges : Array.from(ranges as ArrayLike<any>)).sort((a, b) => a[0] - b[0]);
  // 2. Spec Normalization Loop: Merge overlapping or touching timelines
  const pairs: [number, number][] = [];
  for (const current of rawPairs) {
    const last = pairs[pairs.length - 1];
    if (!last || current[0] > last[1]) pairs.push([current[0], current[1]]); // Clean discontinuity gap
    else last[1] = Math.max(last[1], current[1]); // Normalization: merge overlaps!
  }
  // 3. Return a fully normalized interface literal
  return Object.create(TimeRanges.prototype, {
    length: { value: pairs.length },
    start: {
      value: (i: number) => {
        if (i < 0 || i >= pairs.length) throw new DOMException("Index out of bounds", "IndexSizeError");
        return pairs[i][0];
      },
    },
    end: {
      value: (i: number) => {
        if (i < 0 || i >= pairs.length) throw new DOMException("Index out of bounds", "IndexSizeError");
        return pairs[i][1];
      },
    },
  });
}
