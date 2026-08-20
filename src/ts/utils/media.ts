import { MEDIA_INTENT_BUILD, MEDIA_SETTINGS_BUILD, MEDIA_STATE_BUILD, MEDIA_STATUS_BUILD } from "@consts/media";
import { MediaState, MediaStatus, MediaSettings, MediaReport, CtlrMedia } from "@defs/contract";
import { isStr, isNum, isIter, isSameURL, cleanURL, capitalize } from "@t007/utils";
import { createEl } from "@utils/dom";
import { queryFullscreenEl, queryPictureInPictureEl } from "@utils/dom";
import { Dimensions, MediaType, Source, Sources, Track, Tracks } from "@defs/generics";
import { isObj, mergeObjs as merge } from "sia-reactor/utils";
import { DeepPartial } from "sia-reactor";

// ============ Video Utilities ============
// Types
type SourceLike = Source | (HTMLSourceElement & Record<string, any>);
type TrackLike = Track | (HTMLTrackElement & Record<string, any>);

// Report Generation
export function getMediaReport(m: HTMLMediaElement, isVid = m instanceof HTMLVideoElement, opts = { skipUndef: true }): MediaReport {
  const txtTrackIdx = getTrackIdx(m, "Text"),
    report = { state: getMediaState(m, isVid, txtTrackIdx), status: getMediaStatus(m, isVid, txtTrackIdx), settings: getMediaSettings(m) };
  return { state: merge(MEDIA_STATE_BUILD, report.state, opts), intent: merge(MEDIA_INTENT_BUILD, report.state, opts), status: merge(MEDIA_STATUS_BUILD, report.status, opts), settings: merge(MEDIA_SETTINGS_BUILD, report.settings, opts) } as MediaReport;
}
export const getMediaState = (m: HTMLMediaElement, isVid = m instanceof HTMLVideoElement, _txtTrackIdx = getTrackIdx(m, "Text")): Partial<MediaState> => ({ src: m.src, currentTime: m.currentTime, paused: m.paused, volume: m.volume * 100, muted: m.muted, playbackRate: m.playbackRate, pictureInPicture: queryPictureInPictureEl() === m, fullscreen: queryFullscreenEl() === m, currentTextTrack: _txtTrackIdx, currentAudioTrack: getTrackIdx(m, "Audio"), currentVideoTrack: getTrackIdx(m, "Video"), poster: isVid ? (m as HTMLVideoElement).poster : "", autoplay: m.autoplay, loop: m.loop, preload: m.preload, playsInline: isVid ? m.playsInline : false, crossOrigin: m.crossOrigin, controls: m.controls, controlsList: m.controlsList ?? m.getAttribute("controlsList"), disablePictureInPicture: isVid ? m.disablePictureInPicture ?? m.hasAttribute("disablePictureInPicture") : false, sources: getSources(m), tracks: getTracks(m) });
export const getMediaStatus = (m: HTMLMediaElement, isVid = m instanceof HTMLVideoElement, _txtTrackIdx = getTrackIdx(m, "Text"), _flagsOnly = false): Partial<MediaStatus> => ({ readyState: m.readyState, networkState: m.networkState, error: m.error, seeking: m.seeking, buffered: m.buffered, played: m.played, seekable: m.seekable, duration: m.duration, ended: m.ended, loadedMetadata: m.readyState >= 1, loadedData: m.readyState >= 2, canPlay: m.readyState >= 3, canPlayThrough: m.readyState >= 4, videoWidth: isVid ? (m as HTMLVideoElement).videoWidth : 0, videoHeight: isVid ? (m as HTMLVideoElement).videoHeight : 0, textTracks: _flagsOnly ? undefined : m.textTracks, audioTracks: _flagsOnly ? undefined : (m as any).audioTracks, videoTracks: _flagsOnly ? undefined : (m as any).videoTracks, activeCues: _flagsOnly ? undefined : m.textTracks[_txtTrackIdx]?.activeCues ? Array.from(m.textTracks[_txtTrackIdx].activeCues) : null });
export const getMediaSettings = (m: HTMLMediaElement): DeepPartial<MediaSettings> => ({ defaultMuted: m.defaultMuted, defaultPlaybackRate: m.defaultPlaybackRate, srcObject: m.srcObject });

export function getMediaBoolProps(media: CtlrMedia, prop: "intent" | "state" = "intent"): string[] {
  return Object.keys(media[prop]).filter((k) => typeof media[prop][k as keyof MediaState] === "boolean");
}

export function getSizeTier(container: HTMLElement, { offsetWidth: w, offsetHeight: h } = container) {
  return { width: w, height: h, tier: h <= 130 ? "xxxxx" : w <= 280 ? "xxxx" : w <= 380 ? "xxx" : w <= 480 ? "xx" : w <= 630 ? "x" : "" };
}

// Geometry
export function getRenderedBox({ videoHeight, videoWidth }: { videoHeight?: number; videoWidth?: number }, { width: clientWidth = 0, height: clientHeight = 0 }: { width?: number; height?: number }, { objectFit = "cover", objectPosition = "50% 50%" }: { objectFit?: string; objectPosition?: string }): Partial<Dimensions & { left: number; top: number }> {
  const bbox = { width: clientWidth, height: clientHeight } as DOMRect,
    obj = (((videoHeight ||= 1080), (videoWidth ||= videoHeight * (16 / 9))), videoWidth && videoHeight ? { width: videoWidth, height: videoHeight } : null);
  if (!obj || !objectFit || !objectPosition) return {};
  if (objectFit === "scale-down") objectFit = bbox.width < obj.width || bbox.height < obj.height ? "contain" : "none";
  if (objectFit === "none") return { ...parseObjectPos(objectPosition, bbox, obj), ...obj };
  else if (objectFit === "contain") {
    const objRatio = obj.height / obj.width,
      bboxRatio = bbox.height / bbox.width,
      width = Math.min(bbox.width, bboxRatio > objRatio ? bbox.width : bbox.height / objRatio),
      height = Math.min(bbox.height, bboxRatio > objRatio ? bbox.width * objRatio : bbox.height);
    return { ...parseObjectPos(objectPosition, bbox, { width, height }), width, height };
  } else if (objectFit === "fill") {
    const { left, top, rawLeft, rawTop } = parseObjectPos(objectPosition, bbox, obj);
    return { left: rawLeft.endsWith("%") ? 0 : left, top: rawTop.endsWith("%") ? 0 : top, width: bbox.width, height: bbox.height }; // Relative positioning is discarded with `obj-fit: fill`, so we need to check here if it's relative or not
  } else if (objectFit === "cover") {
    const minRatio = Math.min(bbox.width / obj.width, bbox.height / obj.height);
    let width = obj.width * minRatio,
      height = obj.height * minRatio,
      outRatio = 1;
    if (width < bbox.width) outRatio = bbox.width / width;
    if (Math.abs(outRatio - 1) < 1e-14 && height < bbox.height) outRatio = bbox.height / height;
    (width *= outRatio), (height *= outRatio);
    return { ...parseObjectPos(objectPosition, bbox, { width, height }), width, height };
  } else return {};
}
const parsePosAsPx = (str: string, bboxSize: number, objectSize: number): number => {
  str === "center" ? (str = "50%") : str === "left" || str === "top" ? (str = "0%") : (str === "right" || str === "bottom") && (str = "100%");
  const num = parseFloat(str);
  return !str.endsWith("%") ? num : (bboxSize - objectSize) * (num / 100);
};
const parseObjectPos = (position: string, bbox: DOMRect, object: Dimensions): { left: number; top: number; rawLeft: string; rawTop: string } => {
  if (position === "center") position = "50% 50%";
  const [left, top = "50%"] = position.split(" ");
  return { left: parsePosAsPx(left, bbox.width, object.width), top: parsePosAsPx(top, bbox.height, object.height), rawLeft: left, rawTop: top };
};

// Media Element Cloning
export function cloneMedia<M extends HTMLMediaElement>(v: M): M {
  const newV = v.cloneNode(true) as M;
  newV.tmgPlayer = v.tmgPlayer;
  v.parentElement?.replaceChild(newV, v);
  if (v.srcObject) newV.srcObject = v.srcObject;
  if (v.currentTime) newV.currentTime = v.currentTime;
  if (v.playbackRate !== 1) newV.playbackRate = v.playbackRate;
  if (v.defaultPlaybackRate !== 1) newV.defaultPlaybackRate = v.defaultPlaybackRate;
  if (v.volume !== 1) newV.volume = v.volume;
  if (v.muted) newV.muted = true;
  if (v.defaultMuted) newV.defaultMuted = true;
  if (v.autoplay) newV.autoplay = true;
  if (v.loop) newV.loop = true;
  if (v.controls) newV.controls = true;
  if (v.crossOrigin) newV.crossOrigin = v.crossOrigin;
  if (v.playsInline) newV.playsInline = true;
  if (v.controlsList?.length) newV.controlsList = v.controlsList;
  if (v.disablePictureInPicture) newV.disablePictureInPicture = true;
  if (!v.paused && newV.isConnected) newV.play();
  return newV;
}

// Source Management
export function putSourceDetails(source: any, el: HTMLSourceElement | Record<string, any>): void {
  if (source.src) el.src = source.src;
  if (source.type) el.type = source.type;
  if (source.media) el.media = source.media;
}
export function addSources(sources: SourceLike | Iterable<SourceLike> = [], medium: HTMLElement): HTMLSourceElement | HTMLSourceElement[] {
  const addSource = (source: SourceLike, med: HTMLElement) => {
    const sourceEl = createEl("source");
    putSourceDetails(source, sourceEl);
    return med.appendChild(sourceEl);
  };
  return isIter(sources) ? Array.from(sources as Iterable<SourceLike>, (source) => addSource(source, medium)) : addSource(sources, medium);
}
export function getSources(medium: HTMLElement): MediaState["sources"] {
  const sources = medium.querySelectorAll<HTMLSourceElement>("source"),
    _sources: SourceLike[] = [];
  for (const source of sources) {
    const obj: Record<string, any> = {};
    putSourceDetails(source, obj);
    _sources.push(obj as SourceLike);
  }
  return _sources as MediaState["sources"];
}
export const removeSources = (medium: HTMLElement, sources = medium?.querySelectorAll("source")): void => {
  if (sources) for (const source of sources) source.remove();
};
export function isSameSources(a?: Sources, b?: Sources): boolean {
  if (!a || !b || a.length !== b.length) return false;
  const set = new Set(b.map((s) => `${cleanURL(s.src)}|${s.type}|${s.media}`));
  return a.every((s) => set.has(`${cleanURL(s.src)}|${s.type}|${s.media}`));
}

// Track Management
export type TrackType = "Audio" | "Video" | "Text";
export function putTrackDetails(track: any, el: HTMLTrackElement | Record<string, any>): void {
  if (track.id) el.id = track.id;
  if (track.kind) el.kind = track.kind;
  if (track.label) el.label = track.label;
  if (track.srclang) el.srclang = track.srclang;
  if (track.src) el.src = track.src;
  if (track.default) el.default = track.default;
}
export function addTracks(tracks: TrackLike | Iterable<TrackLike> = [], medium: HTMLElement): HTMLTrackElement | HTMLTrackElement[] {
  const addTrack = (track: TrackLike, med: HTMLElement) => {
    const trackEl = createEl("track");
    return putTrackDetails(track, trackEl), med.appendChild(trackEl);
  };
  return isIter(tracks) ? Array.from(tracks as Iterable<TrackLike>, (track) => addTrack(track, medium)) : addTrack(tracks, medium);
}
export function getTracks(medium: HTMLElement, cues = false): TrackLike[] {
  const tracks = medium.querySelectorAll<HTMLTrackElement>(!cues ? "track" : "track:is([kind='captions'], [kind='subtitles'])"),
    _tracks: TrackLike[] = [];
  for (const track of tracks) {
    const obj: Record<string, any> = {};
    putTrackDetails(track, obj), _tracks.push(obj as TrackLike);
  }
  return _tracks;
}
export const removeTracks = (medium: HTMLElement, tracks = medium?.querySelectorAll("track")): void => {
  if (tracks) for (const track of tracks) if (track.kind === "subtitles" || track.kind === "captions") track.remove();
};
export function isSameTracks(a?: Tracks, b?: Tracks): boolean {
  if (!a || !b || a.length !== b.length) return false;
  const set = new Set(b.map((t) => `${cleanURL(t.src)}|${t.kind}|${t.label}|${t.srclang}`));
  return a.every((t) => set.has(`${cleanURL(t.src)}|${t.kind}|${t.label}|${t.srclang}`));
}
const isTrack = (type: TrackType, term: any) => `${type}Track` in window && term instanceof (window as any)[`${type}Track`];
export function getTrackIdx(medium: HTMLMediaElement, type: TrackType = "Text", term: any = "active", list = (medium as any)[`${type.toLowerCase()}Tracks`]): number {
  if (isNum(term)) return term;
  if (list && term === "active") {
    if (type === "Text") for (let i = 0; i < +list.length; i++) if (list[i].mode === "showing") return i;
    if (type === "Audio") for (let i = 0; i < +list.length; i++) if (list[i].enabled) return i;
    if (type === "Video") return list.selectedIndex ?? -1;
  } else if (list && isTrack(type, term)) return Array.prototype.indexOf.call(list, term);
  if (list && isObj(term)) return Array.prototype.findIndex.call(list, (t: any) => `${t.kind}${t.label}${t.language}` === `${term.kind}${term.label}${term.language || term.srclang}`);
  if (list && isStr(term)) return (term = term.toLowerCase()), !isNaN(+term) ? +term : Array.prototype.findIndex.call(list, (t: any) => t.id?.toLowerCase?.() === term || t.label?.toLowerCase() === term || t.srclang?.toLowerCase() === term || t.language?.toLowerCase() === term || isSameURL(t.src, term));
  return -1;
}
export function getTrackLabel(list: ArrayLike<any>, index: number, safe = true, track = list?.[index]): string {
  let label = !track ? "" : track.label || track.displayName || track.name || track.languageName;
  if (!track || label) return !track ? "" : capitalize(label.toLowerCase());
  const code = getTrackLang(track);
  if (code)
    try {
      label = new Intl.DisplayNames([navigator.language || "en"], { type: "language" }).of(code);
    } catch {}
  return label || (safe && index > -1 ? `Track ${index + 1}` : "");
}
export function getTrackKind(track: any, capped = false, ssId = track?.vssId || track?.originalTextId): string {
  const kind = !track ? "" : (track.kind || track.type || "").toLowerCase() || (ssId ? (ssId.includes("cc") ? "captions" : "subtitles") : "captions");
  return capped ? capitalize(kind) : kind;
}
export const getTrackLang = (track: any): string => (!track ? "" : track.language || track.languageCode || track.srclang || "");
export function setCurrentTrack(medium: HTMLMediaElement, type: TrackType = "Text", term: any, flush = false, list = (medium as any)[`${type.toLowerCase()}Tracks`]): void {
  const idx = getTrackIdx(medium, type, term, list);
  if (list && type !== "Video") for (let i = 0; i < list.length; i++) type === "Text" ? (list[i].mode = i === idx ? "showing" : flush ? "disabled" : "hidden") : (list[i].enabled = i === idx);
  else list?.[idx] && (list[idx].selected = true);
}
// Capbailities
export const DUMMY_VID = createEl("video");
export const DUMMY_AUD = createEl("audio");
export function canUseVolume(type: MediaType = "video", dummy = type === "video" ? DUMMY_VID : DUMMY_AUD): boolean {
  try {
    const prev = dummy.volume;
    dummy.volume = 0.5;
    const works = dummy.volume === 0.5;
    return (dummy.volume = prev), works;
  } catch {
    return false;
  }
}
export const canMuteVolume = (type: MediaType = "video", dummy = type === "video" ? DUMMY_VID : DUMMY_AUD): boolean => !!dummy && "muted" in dummy;
export function canUseRate(type: MediaType = "video", dummy = type === "video" ? DUMMY_VID : DUMMY_AUD): boolean {
  try {
    const prev = dummy.playbackRate;
    dummy.playbackRate = 0.5;
    const works = dummy.playbackRate === 0.5;
    return (dummy.playbackRate = prev), works;
  } catch {
    return false;
  }
}
export const canTextTracks = (type: MediaType = "video", dummy = type === "video" ? DUMMY_VID : DUMMY_AUD): boolean => !!dummy && "textTracks" in dummy;
export const canVideoTracks = (type: MediaType = "video", dummy = type === "video" ? DUMMY_VID : DUMMY_AUD): boolean => !!dummy && "videoTracks" in dummy;
export const canAudioTracks = (type: MediaType = "video", dummy = type === "video" ? DUMMY_VID : DUMMY_AUD): boolean => !!dummy && "audioTracks" in dummy;

// ============ Caption/Subtitle Utilities ============
export const stripTags = (text: string): string => text.replace(/<(\/)?([a-z0-9.:]+)([^>]*)>/gi, "");

export function srtToVtt(srt: string, vttLines: string[] = ["WEBVTT", ""]): string {
  const input = srt.replace(/\r\n?/g, "\n").trim();
  for (const block of input.split(/\n{2,}/)) {
    const lines = block.split("\n");
    let idx = /^\d+$/.test(lines[0].trim()) ? 1 : 0;
    const timing = lines[idx]?.trim().replace(/\s+/g, " "),
      m = timing?.match(/(\d{1,2}:\d{2}:\d{2})(?:[.,](\d{1,3}))?\s*-->\s*(\d{1,2}:\d{2}:\d{2})(?:[.,](\d{1,3}))?/);
    if (!m) continue;
    const [, startHms, startMsRaw = "0", endHms, endMsRaw = "0"] = m,
      to3 = (ms: string) => ms.padEnd(3, "0").slice(0, 3);
    vttLines.push(startHms + "." + to3(startMsRaw) + " --> " + endHms + "." + to3(endMsRaw));
    for (let i = idx + 1; i < lines.length; i++) vttLines.push(lines[i]);
    vttLines.push("");
  }
  return vttLines.join("\n");
}

export function parseVttText(text: string): string {
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)),
    state = { tag: /\<(\/)?(\d[\d:.]*|\w+)([^>]*)>/gi, o: "", l: 0, p: null as string | null, c: "", spans: [] as string[] };
  let m: RegExpExecArray | null;
  while ((m = state.tag.exec(text))) {
    const chunk = text.slice(state.l, m.index);
    if (chunk) state.c += esc(chunk);
    const [_, cls, tag_n, rest] = m,
      low = tag_n.toLowerCase();
    if (/^[0-9]/.test(tag_n)) {
      state.o += state.p ? `<span data-part="timed" data-time="${state.p}">${state.c}${state.spans.map(() => "</span>").join("")}</span>` : state.c;
      (state.p = tag_n), (state.c = state.spans.join(""));
    } else if (cls) /^(c|v|lang)$/.test(low) ? ((state.c += "</span>"), state.spans.pop()) : (state.c += `</${low}>`);
    else if (/^(b|i|u|ruby|rt)$/.test(low)) state.c += `<${low}>`;
    else if (low === "c") state.c += state.spans[state.spans.push(`<span class="vtt-c ${rest.replace(/\.([a-z0-9_-]+)/gi, "$1 ").trim()}">`) - 1];
    else if (low === "v") state.c += state.spans[state.spans.push(`<span data-part="voice" data-badge="${esc(rest.trim()) || "Speaker"}">`) - 1];
    else if (low === "lang") state.c += state.spans[state.spans.push(`<span lang="${esc(rest.trim())}">`) - 1];
    state.l = state.tag.lastIndex;
  }
  const lChunk = text.slice(state.l);
  if (lChunk) state.c += esc(lChunk);
  return state.o + (state.p ? `<span data-part="timed" data-time="${state.p}">${state.c}</span>` : state.c);
}

export function formatVttLine(p: string, maxChars: number): string[] {
  const state = { tokens: p.match(/<[^>]+>|\s+|[^<\s]+/g) || [], stack: [] as string[], parts: [] as string[], line: "", len: 0, openStr: "", closeStr: "", timeTag: "", lastWasTag: false, pendingSpace: false },
    updateTags = () => ((state.openStr = state.stack.map((n) => `<${n}>`).join("")), (state.closeStr = state.stack.reduceRight((a, n) => a + `</${n}>`, ""))),
    flush = () => state.line && (state.parts.push(state.line + state.closeStr), (state.line = (state.timeTag || "") + state.openStr), (state.len = 0), (state.lastWasTag = true));
  for (const tok of state.tokens) {
    const tag = tok[0] === "<",
      closeTag = tag && tok[1] === "/";
    if (tag) {
      const m = tok.match(/^<\/?\s*([a-z0-9._:-]+)/i),
        n = m?.[1] || "",
        timing = /^\d/.test(n);
      if (timing) {
        state.pendingSpace && ((state.line += " "), (state.len += 1));
        (state.pendingSpace = false), (state.timeTag = tok), (state.line += tok), (state.lastWasTag = true);
        continue;
      }
      state.pendingSpace = false;
      if (state.line && !state.lastWasTag && !closeTag) state.line += " ";
      if (!closeTag && !tok.endsWith("/>") && n) state.stack.push(n), updateTags();
      if (closeTag && state.stack.length) state.stack.pop(), updateTags();
      (state.lastWasTag = true), (state.line += tok);
      continue;
    }
    if (tok[0] <= " ") {
      (state.pendingSpace = !!state.line), (state.lastWasTag = false);
      continue;
    }
    state.pendingSpace = false;
    const len = stripTags(tok).length,
      needSpace = state.line && !state.lastWasTag;
    if (state.len + (needSpace ? 1 : 0) + len > maxChars) flush();
    if (needSpace) (state.line += " "), (state.len += 1);
    (state.line += tok), (state.len += len), (state.lastWasTag = false);
  }
  return flush(), state.parts;
}
