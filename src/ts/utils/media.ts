import { MEDIA_INTENT_BUILD, MEDIA_SETTINGS_BUILD, MEDIA_STATE_BUILD, MEDIA_STATUS_BUILD } from "@consts/media";
import { MediaState, MediaStatus, MediaSettings, MediaReport, CtlrMedia } from "@defs/contract";
import { isStr, isNum, isIter, isSameURL, cleanURL, capitalize } from "@t007/utils";
import { createEl } from "@utils/dom";
import { queryFullscreenEl, queryPictureInPictureEl } from "@utils/dom";
import { Source, Sources, Track, Tracks } from "@defs/generics";
import { isObj, mergeObjs as merge } from "sia-reactor/utils";
import { DeepPartial } from "sia-reactor";

// Types
export type TrackType = "Audio" | "Video" | "Text";
type SourceLike = Source | (HTMLSourceElement & Record<string, any>);
type TrackLike = Track | (HTMLTrackElement & Record<string, any>);

// Report Generation
export function getMediaReport(m: HTMLMediaElement, opts = { skipUndef: true }, _isVid = m instanceof HTMLVideoElement, _txtTrackIdx = getTrackIdx(m, "Text")): MediaReport {
  const [state, status, settings] = [getMediaState(m, _isVid, _txtTrackIdx), getMediaStatus(m, false, _isVid, _txtTrackIdx), getMediaSettings(m)];
  return {
    state: merge(MEDIA_STATE_BUILD, state, opts),
    intent: merge(MEDIA_INTENT_BUILD, state, opts),
    status: merge(MEDIA_STATUS_BUILD, status, opts),
    settings: merge(MEDIA_SETTINGS_BUILD, settings, opts),
  } as MediaReport;
}

export const getMediaState = (m: HTMLMediaElement, _isVid = m instanceof HTMLVideoElement, _txtTrackIdx = getTrackIdx(m, "Text")): Partial<MediaState> => ({
  src: m.src,
  currentTime: m.currentTime,
  paused: m.paused,
  volume: m.volume * 100,
  muted: m.muted,
  playbackRate: m.playbackRate,
  pictureInPicture: queryPictureInPictureEl() === m,
  fullscreen: queryFullscreenEl() === m,
  currentTextTrack: _txtTrackIdx,
  currentAudioTrack: getTrackIdx(m, "Audio"),
  currentVideoTrack: getTrackIdx(m, "Video"),
  poster: _isVid ? (m as HTMLVideoElement).poster : "",
  autoplay: m.autoplay,
  loop: m.loop,
  preload: m.preload,
  playsInline: _isVid ? m.playsInline : false,
  crossOrigin: m.crossOrigin,
  controls: m.controls,
  controlsList: m.controlsList,
  sources: getSources(m),
  tracks: getTracks(m),
});
export const getMediaStatus = (m: HTMLMediaElement, flagsOnly = false, _isVid = m instanceof HTMLVideoElement, _txtTrackIdx = getTrackIdx(m, "Text")): Partial<MediaStatus> => ({
  readyState: m.readyState,
  networkState: m.networkState,
  error: m.error,
  seeking: m.seeking,
  buffered: m.buffered,
  played: m.played,
  seekable: m.seekable,
  duration: m.duration,
  ended: m.ended,
  loadedMetadata: m.readyState >= 1,
  loadedData: m.readyState >= 2,
  canPlay: m.readyState >= 3,
  canPlayThrough: m.readyState >= 4,
  videoWidth: _isVid ? (m as HTMLVideoElement).videoWidth : 0,
  videoHeight: _isVid ? (m as HTMLVideoElement).videoHeight : 0,
  textTracks: flagsOnly ? undefined : m.textTracks,
  audioTracks: flagsOnly ? undefined : (m as any).audioTracks,
  videoTracks: flagsOnly ? undefined : (m as any).videoTracks,
  activeCues: flagsOnly ? undefined : m.textTracks[_txtTrackIdx]?.activeCues ? [...m.textTracks[_txtTrackIdx].activeCues] : null,
});
export const getMediaSettings = (m: HTMLMediaElement): DeepPartial<MediaSettings> => ({
  defaultMuted: m.defaultMuted,
  defaultPlaybackRate: m.defaultPlaybackRate,
  srcObject: m.srcObject,
});

export const getMediaProps = ({ state }: CtlrMedia, type = "boolean") => Object.keys(state).filter((k) => typeof state[k as keyof MediaState] === type) as Array<keyof MediaState>;

export const isFeatured = ({ intent, settings, status, features }: CtlrMedia, feat: string) => !(feat in intent || feat in settings || feat in status) || !!(features as any)[feat] || /^(src|currentTime|duration|paused|ended)$/.test(feat); // use for `string` not `keyof MediaFeatures`

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

// Cloning
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
