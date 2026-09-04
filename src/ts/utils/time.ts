import { CtlrMedia } from "@defs/contract";
import { capitalize, isArr, isNum } from "@t007/utils";

// Time Ranges

export function getMediaProgress({ state: s, status: st }: CtlrMedia, time = s.currentTime): number {
  if (st.isLive) {
    if (!st.seekable.length || s.live) return 1;
    const min = st.seekable.start(0),
      dvr = st.seekable.end(st.seekable.length - 1) - min;
    return dvr > 0 ? (time - min) / dvr : 1;
  } else return time / st.duration;
}
export const getMediaTime = (media: CtlrMedia, percent: number, _min = getMediaMin(media)): number => (media.status.isLive ? _min! + percent * (getMediaMax(media) - _min!) : percent * media.status.duration);
export const getMediaMin = ({ status: st, state: s }: Pick<CtlrMedia, "state" | "status">): number => (st.isLive ? (st.seekable.length ? (st.canSeekLive ? st.seekable.start(0) : st.seekable.end(st.seekable.length - 1)) : s.currentTime) : 0); // live?, can't seek?, jump to edge
export const getMediaMax = ({ status: st, state: s }: Pick<CtlrMedia, "state" | "status">): number => (st.isLive ? (st.seekable.length ? st.seekable.end(st.seekable.length - 1) : s.currentTime) : st.duration);

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
  const pairs: [number, number][] = [], // 1. Spec Normalization Loop: Merge overlapping or touching timelines
    rawPairs = (isArr(ranges) ? ranges : Array.from(ranges)).sort((a, b) => a[0] - b[0]); // 2. Sort incoming intervals chronologically by start time
  for (const current of rawPairs) {
    const last = pairs[pairs.length - 1];
    if (!last || current[0] > last[1]) pairs.push([current[0], current[1]]); // Clean discontinuity gap
    else last[1] = Math.max(last[1], current[1]); // Normalization: merge overlaps!
  }
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
  }); // 3. Return a fully normalized interface literal
}

// Time Formatting

export type TimeMode = "elapsed" | "remaining";
export type TimeFormat = "digital" | "human" | "human-long";
export type TimeCasing = "" | "lower" | "upper" | "title";
export type TimeKey = "ms" | "s" | "m" | "h" | "d" | "w" | "mo" | "y";

const cas = (str = "", casing?: TimeCasing) => (casing === "upper" ? str.toUpperCase() : casing === "title" ? capitalize(str) : casing ? str.toLowerCase() : str),
  wrd = (lg = true, k = "ms" as TimeKey, csg?: TimeCasing, n = 0, x = n == 1 ? "" : "s") => cas(k === "y" ? ` ${lg ? "year" : "yr"}${x} ` : k === "mo" ? ` ${lg ? "month" : "mon"}${x} ` : k === "w" ? ` ${lg ? "week" : "wk"}${x} ` : k === "d" ? ` day${x} ` : k === "h" ? ` ${lg ? "hour" : "hr"}${x} ` : k === "m" ? ` ${lg ? "minute" : "min"}${x} ` : k === "s" ? ` ${lg ? "second" : "sec"}${x} ` : lg ? ` millisecond${x} ` : ` ms `, csg);

export function formatMediaTime({ time: t = 0, format = "digital" as TimeFormat, elapsed = true, showMs = false, casing = "" as TimeCasing, fmt = (key = "ms" as TimeKey, n = 0) => wrd(format.at(-1) === "g", key, casing, n) } = {}): string {
  const pad = (v: string | number, n = 2) => String(v).padStart(n, isNum(+v) ? "0" : "-");
  if (isNaN(t ?? NaN) || t === Infinity) return format !== "digital" ? `-${fmt("m")}-${fmt("s")}${!elapsed ? "left" : ""}`.trim() : !elapsed ? "-:--" : "-:--";
  // prettier-ignore
  const s = Math.floor(Math.abs(t) % 60), m = Math.floor(Math.abs(t) / 60) % 60, h = Math.floor(Math.abs(t) / 3600) % 24, d = Math.floor(Math.abs(t) / 86400);
  if (format !== "digital") return `${formatUITime(t * 1000, format === "human-long", showMs, casing, fmt)}${!elapsed ? " left" : ""}`;
  const base = d ? `${d}:${pad(h)}:${pad(m)}:${pad(s)}` : h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  return `${!elapsed ? "-" : ""}${base}`; // no ms here
}

export function formatUITime(t?: number | boolean, long = false as boolean | "date", showMs = true, casing = "" as TimeCasing, fmt = (key = "ms" as TimeKey, n = 0) => wrd(!!long, key, casing, n)): string {
  if (t === true || t === 0) return t === 0 ? `0${fmt("s")}`.trimEnd() : cas("Auto", casing);
  if (t === false || t === -1) return cas("Off", casing);
  if (isNaN(t ?? NaN) || t === Infinity) return `-${fmt("m")}-${fmt("s")}`.trimEnd();
  const abt = Math.abs(t!),
    sc = abt / 1000;
  if (long === "date") {
    const [n, k]: [number, TimeKey] = sc < 60 ? [sc, "s"] : sc < 3600 ? [Math.floor(sc / 60), "m"] : sc < 86400 ? [Math.floor(sc / 3600), "h"] : sc < 604800 ? [Math.floor(sc / 86400), "d"] : sc < 2592000 ? [Math.floor(sc / 604800), "w"] : sc < 31536000 ? [Math.floor(sc / 2592000), "mo"] : [Math.floor(sc / 31536000), "y"],
      text = `${n === 1 ? (k === "h" ? "an" : "a") : Math.floor(n)}${fmt(k, n).trimEnd()}`;
    return cas(t! > 0 ? `in ${text}` : `${text} ago`, casing);
  }
  // prettier-ignore
  const ms = Math.floor(abt % 1000), s = Math.floor(sc % 60), m = Math.floor(sc / 60) % 60, h = Math.floor(sc / 3600) % 24, d = Math.floor((sc % 31536000 % 2592000 % 604800) / 86400), w = Math.floor((sc % 31536000 % 2592000) / 604800), mo = Math.floor((sc % 31536000) / 2592000), y = Math.floor(sc / 31536000);
  let base = ""; // fixed-second approximations are standard practice
  y > 0 && (base += `${y}${fmt("y", y)}`), mo > 0 && (base += `${mo}${fmt("mo", mo)}`), w > 0 && (base += `${w}${fmt("w", w)}`), d > 0 && (base += `${d}${fmt("d", d)}`), h > 0 && (base += `${h}${fmt("h", h)}`), m > 0 && (base += `${m}${fmt("m", m)}`), (s > 0 || (!showMs && !base)) && (base += `${s}${fmt("s", s)}`), showMs && (ms > 0 || !base) && (base += `${ms}${fmt("ms", ms)}`);
  return `${t! < 0 ? "-" : ""}${base.trim()}`;
}

// #FOSSIL: formatVisit = (d, sx = "") => ((d = Math.floor((Date.now() - new Date(d).getTime()) / 1000)), `${d < 60 ? `${d} second` : d < 3600 ? `${Math.floor(d / 60)} minute` : d < 86400 ? `${Math.floor(d / 3600)} hour` : d < 604800 ? `${Math.floor(d / 86400)} day` : d < 2592000 ? `${Math.floor(d / 604800)} week` : d < 31536000 ? `${Math.floor(d / 2592000)} month` : `${Math.floor(d / 31536000)} year`}`.replace(/(\d+)\s(\w+)/g, (_, n, u) => (n == 1 ? `${u[0] == "h" ? "an" : "a"} ${u}` : `${n} ${u}s`)) + sx);
