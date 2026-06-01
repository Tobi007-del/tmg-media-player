import { BaseTech } from "./base";
import type { REvent, Paths } from "sia-reactor";
import type { Controller } from "@core/controller";
import type { CtlrMedia, MediaIntent, MediaFeatures } from "@defs/contract";
import { AUDIO_EXTENSIONS, VIDEO_EXTENSIONS } from "@utils/matcher";
import { isStr } from "@utils/obj";
import type { TrackType } from "@utils/media";
import { getTrackIdx, setCurrentTrack, canCtrlVolume, canMuteVolume, canCtrlRate, canTextTracks, canVideoTracks, canAudioTracks } from "@utils/media";
import { enterFullscreen, exitFullscreen, queryFullscreenEl, supportsFullscreen, supportsPictureInPicture } from "@utils/dom";
import { observeMutation } from "@utils/dom";
import { getSources, getTracks, removeSources, addSources, isSameSources, isSameTracks, removeTracks, addTracks } from "@utils/media";
import { isSameURL } from "@utils/str";

export class HTML5Tech extends BaseTech<HTMLMediaElement> {
  public static readonly techName: string = "html5";
  public static override canPlaySource(src: string): boolean {
    return VIDEO_EXTENSIONS.test(src) || AUDIO_EXTENSIONS.test(src);
  }
  constructor(ctlr: Controller, features?: MediaFeatures) {
    // prettier-ignore
    const isAudio = ctlr.media.type === "audio", canTxtTrack = canTextTracks(ctlr.media.type), canVidTrack = !isAudio && canVideoTracks(ctlr.media.type), canAudTrack = canAudioTracks(ctlr.media.type);
    // prettier-ignore
    super(ctlr, {
      // Kinda Core
      volume: canCtrlVolume(ctlr.media.type), muted: canMuteVolume(ctlr.media.type), playbackRate: canCtrlRate(ctlr.media.type),
      // Modes
      pictureInPicture: !isAudio && supportsPictureInPicture() && !ctlr.media.state.disablePictureInPicture, fullscreen: !isAudio && supportsFullscreen(),
      // Attributes
      poster: !isAudio, autoplay: true, loop: true, playsInline: !isAudio, preload: true, crossOrigin: true, 
      controls: true, controlsList: true, disablePictureInPicture: true, sources: true, tracks: true,
      // Currents
      currentTextTrack: canTxtTrack, currentVideoTrack: canVidTrack, currentAudioTrack: canAudTrack, activeCue: canTxtTrack,
      // Infos
      readyState: true, networkState: true, error: true, waiting: true, stalled: true,
      seeking: true, buffered: true, played: true, seekable: true, videoWidth: !isAudio, videoHeight: !isAudio, 
      loadedMetadata: true, loadedData: true, canPlay: true, canPlayThrough: true,
      // Lists
      textTracks: canTxtTrack, videoTracks: !isAudio && canVidTrack, audioTracks: canAudTrack,
      // Settings
      defaultMuted: true, defaultPlaybackRate: true, srcObject: true, ...features,
    });
  }
  // ===========================================================================
  // WIRING (Connections Only)
  // ===========================================================================
  // --- Core Wiring ---
  protected override wireSrc(): void {
    this.el.addEventListener("loadstart", this.setLoadStartInfo, this.evtOpts.EL);
    this.config.on("intent.src", this.handleSrcIntent, this.evtOpts.CONFIG);
  }
  protected override wireCurrentTime(): void {
    this.el.addEventListener("timeupdate", this.setTimeUpdateState, this.evtOpts.EL);
    this.el.addEventListener("seeking", this.setSeekingState, this.evtOpts.EL);
    this.el.addEventListener("seeked", this.setSeekedState, this.evtOpts.EL);
    this.config.get("state.currentTime", () => this.el.currentTime, { signal: this.signal }); // #VIRTUAL: reliable return value
    this.config.on("intent.currentTime", this.handleCurrentTimeIntent, this.evtOpts.CONFIG);
  }
  protected override wireDuration(): void {
    this.el.addEventListener("durationchange", this.setDurationChangeState, this.evtOpts.EL);
  }
  protected override wirePaused(): void {
    this.el.addEventListener("play", this.setPlayState, this.evtOpts.EL);
    this.el.addEventListener("pause", this.setPauseState, this.evtOpts.EL);
    this.config.on("intent.paused", this.handlePausedIntent, this.evtOpts.CONFIG);
  }
  protected override wireEnded(): void {
    this.el.addEventListener("ended", this.setEndedState, this.evtOpts.EL);
  }
  // --- Features Wiring ---
  protected override wireFeatures(f = this.config.features): void {
    super.wireFeatures(); // Calls individual feature wires (volume, etc.) above
    this.wireHTMLState(); // Attributes Reverse-Sync (Mutation Observer)
    // Status (Bulk wiring)
    const loadEvents = ["loadstart", "progress", "suspend", "abort", "emptied", "stalled"];
    loadEvents.forEach((e) => this.el.addEventListener(e, this.handleLoadStatus, this.evtOpts.CONFIG));
    this.el.addEventListener("error", this.handleErrorStatus, this.evtOpts.CONFIG);
    this.el.addEventListener("waiting", this.handleWaitingStatus, this.evtOpts.CONFIG);
    this.el.addEventListener("playing", this.handlePlayingStatus, this.evtOpts.CONFIG);
    this.el.addEventListener("stalled", this.handleStalledStatus, this.evtOpts.CONFIG);
    this.el.addEventListener("loadedmetadata", this.handleLoadedMetadataStatus, this.evtOpts.CONFIG);
    this.el.addEventListener("loadeddata", this.handleLoadedDataStatus, this.evtOpts.CONFIG);
    this.el.addEventListener("canplay", this.handleCanPlayStatus, this.evtOpts.CONFIG);
    this.el.addEventListener("canplaythrough", this.handleCanPlayThroughStatus, this.evtOpts.CONFIG);
    // Tracks & Cues
    f.textTracks && this.wireMediaTracks("textTracks"), f.audioTracks && this.wireMediaTracks("audioTracks"), f.videoTracks && this.wireMediaTracks("videoTracks");
    f.activeCue && this.wireActiveCue?.();
  }
  // --- Engine Inputs Wiring ---
  protected wireVolume(): void {
    this.el.addEventListener("volumechange", this.setVolumeChangeState, this.evtOpts.EL);
    this.config.on("intent.volume", this.handleVolumeIntent, this.evtOpts.CONFIG);
  }
  protected wireMuted(): void {
    // Native 'volumechange' handles state update
    this.config.on("intent.muted", this.handleMutedIntent, this.evtOpts.CONFIG);
  }
  protected wirePlaybackRate(): void {
    this.el.addEventListener("ratechange", this.setRateChangeState, this.evtOpts.EL);
    this.config.on("intent.playbackRate", this.handlePlaybackRateIntent, this.evtOpts.CONFIG);
  }
  // --- Presentation Modes Wiring ---
  protected wirePictureInPicture(): void {
    this.el.addEventListener("enterpictureinpicture", this.setEnterPiPState, this.evtOpts.EL);
    this.el.addEventListener("leavepictureinpicture", this.setLeavePiPState, this.evtOpts.EL);
    this.config.on("intent.pictureInPicture", this.handlePiPIntent, this.evtOpts.CONFIG);
  }
  protected wireFullscreen(): void {
    this.el.addEventListener("webkitbeginfullscreen", this.setWebkitBeginFullscreenState, this.evtOpts.CONFIG);
    this.el.addEventListener("webkitendfullscreen", this.setWebkitEndFullscreenState, this.evtOpts.CONFIG);
    this.ctlr.state.watch("docInFullscreen", this.setFullscreenChangeState, this.evtOpts.CONFIG);
    this.config.on("intent.fullscreen", this.handleFullscreenIntent, this.evtOpts.CONFIG);
  }
  // --- Track Switching Wiring ---
  protected wireCurrentTrack(type: TrackType): void {
    this.config.set(`intent.current${type}Track`, (term) => getTrackIdx(this.el, type, term), { signal: this.signal }); // pass `unknown` term, the track will surely be found if available
    const list = (this.el as any)[`${type.toLowerCase()}Tracks`];
    list?.addEventListener("change", () => this.setCurrentTrackState(type, list), this.evtOpts.CONFIG);
    this.config.on(`intent.current${type}Track`, (e) => this.handleCurrentTrackIntent(e, type, list), this.evtOpts.CONFIG);
  }
  protected wireCurrentTextTrack(): void {
    this.wireCurrentTrack("Text");
  }
  protected wireCurrentAudioTrack(): void {
    this.wireCurrentTrack("Audio");
  }
  protected wireCurrentVideoTrack(): void {
    this.wireCurrentTrack("Video");
  }
  // --- HTML (Bulk Wiring) ---
  protected wireHTMLState(): void {
    observeMutation(this.el, this.setHTMLStateFromMutation, { attributes: true, childList: true, subtree: false }, this.signal);
  }
  // --- Attribute Wiring ---
  protected bindAttr<K extends keyof MediaIntent>(key: K, isBool = false): void {
    this.config.on(`intent.${key}` as Paths<CtlrMedia>, (e) => this.handleAttributeIntent(e, key, isBool), this.evtOpts.CONFIG); // non-casted union reached peak ts complexity :)
  }
  protected wirePoster(): void {
    this.bindAttr("poster");
  }
  protected wireAutoplay(): void {
    this.bindAttr("autoplay", true);
  }
  protected wireLoop(): void {
    this.bindAttr("loop", true);
  }
  protected wirePreload(): void {
    this.bindAttr("preload");
  }
  protected wirePlaysInline(): void {
    this.bindAttr("playsInline", true);
  }
  protected wireCrossOrigin(): void {
    this.bindAttr("crossOrigin");
  }
  protected wireControls(): void {
    this.bindAttr("controls", true);
  }
  protected wireControlsList(): void {
    this.bindAttr("controlsList");
  }
  protected wireDisablePictureInPicture(): void {
    this.bindAttr("disablePictureInPicture", true);
    this.config.watch("state.disablePictureInPicture", this.handleDisablePiPState);
  }
  // --- Lists Wiring ---
  protected wireSources(): void {
    this.config.on("intent.sources", this.handleSourcesIntent, this.evtOpts.CONFIG);
  }
  protected wireTracks(): void {
    this.config.on("intent.tracks", this.handleTracksIntent, this.evtOpts.CONFIG);
  }
  // --- Status Tracks Wiring ---
  protected wireMediaTracks(type: "textTracks" | "videoTracks" | "audioTracks", list = (this.el as any)[type]): void {
    list && ["addtrack", "removetrack"].forEach((e) => list.addEventListener(e, () => this.handleTracksStatus(type, list), this.evtOpts.CONFIG));
  }
  // --- Active Cue Wiring ---
  protected textTrack: TextTrack | null = null;
  protected wireActiveCue(strict = true): void {
    const onChange = (track = this.el.textTracks[getTrackIdx(this.el, "Text")]) => {
      if (this.textTrack && this.textTrack !== track) this.textTrack.removeEventListener("cuechange", this.handleActiveCueStatus, this.evtOpts.EL);
      (this.textTrack = track)?.addEventListener("cuechange", this.handleActiveCueStatus, this.evtOpts.EL);
      this.handleActiveCueStatus({ target: track });
    };
    strict ? this.config.on("state.currentTextTrack", ({ value }) => onChange(this.el.textTracks[value]), this.evtOpts.CONFIG) : this.el.textTracks.addEventListener("change", () => onChange(), this.evtOpts.EL);
  }
  // --- Settings Wiring ---
  protected wireDefaultMuted(): void {
    this.config.on("settings.defaultMuted", this.handleDefaultMutedSetting, this.evtOpts.CONFIG);
  }
  protected wireDefaultPlaybackRate(): void {
    this.config.on("settings.defaultPlaybackRate", this.handleDefaultPlaybackRateSetting, this.evtOpts.CONFIG);
  }
  // ===========================================================================
  // HANDLERS (The Logic - Auto-Guarded by Controllable)
  // ===========================================================================
  // --- Core States ---
  protected setLoadStartInfo(): void {
    const { state: s, status: st } = this.config;
    st.error = st.activeCue = null;
    st.waiting = true;
    st.ended = st.stalled = st.loadedData = st.loadedMetadata = st.canPlay = st.canPlayThrough = false;
    st.buffered = this.el.buffered;
    st.seekable = this.el.seekable;
    st.duration = this.el.duration;
    s.src = this.el.src;
    s.paused = this.el.paused;
  }
  protected setTimeUpdateState(): void {
    this.config.state.currentTime = this.el.currentTime;
  }
  protected setSeekingState(): void {
    this.config.status.seeking = true;
  }
  protected setSeekedState(): void {
    this.config.status.seeking = false;
  }
  protected setDurationChangeState(): void {
    this.config.status.duration = this.el.duration;
  }
  protected setPlayState(): void {
    this.config.state.paused = false;
  }
  protected setPauseState(): void {
    this.config.state.paused = true;
    this.config.status.waiting = false; // UX boost
  }
  protected setEndedState(): void {
    this.config.status.ended = this.config.state.paused = true;
  }
  // --- Core Intents ---
  protected handleSrcIntent(e: REvent<CtlrMedia, "intent.src">): void {
    if (e.resolved || isSameURL(this.el.src, e.value)) return;
    (this.el.src = e.value ?? ""), this.el.load();
    e.resolve(HTML5Tech.techName);
  }
  protected handleCurrentTimeIntent(e: REvent<CtlrMedia, "intent.currentTime">): void {
    if (e.resolved) return;
    this.el.currentTime = e.value;
    e.resolve(HTML5Tech.techName);
  }
  protected handlePausedIntent(e: REvent<CtlrMedia, "intent.paused">): void {
    if (e.resolved) return;
    (e.value ? this.el.pause() : this.el.play())?.catch?.((err) => this.ctlr.log(err, "error"));
    e.resolve(HTML5Tech.techName);
  }
  // --- Feature States ---
  protected setVolumeChangeState(): void {
    this.config.state.volume = this.el.volume * 100;
    this.config.state.muted = this.el.muted;
  }
  protected setRateChangeState(): void {
    this.config.state.playbackRate = this.el.playbackRate;
  }
  protected setEnterPiPState(): void {
    this.config.state.pictureInPicture = true;
  }
  protected setLeavePiPState(): void {
    this.config.state.pictureInPicture = false;
  }
  protected setFullscreenChangeState(docInFs?: boolean): void {
    this.config.state.fullscreen = docInFs ? queryFullscreenEl() === this.el : false;
  }
  protected setWebkitBeginFullscreenState(): void {
    this.config.state.fullscreen = true;
  }
  protected setWebkitEndFullscreenState(): void {
    this.config.state.fullscreen = false;
  }
  protected setCurrentTrackState(type: TrackType, list: any): void {
    this.config.state[`current${type}Track`] = getTrackIdx(this.el, type, "active", list);
  }
  protected setHTMLStateFromMutation(mutations: MutationRecord[]): void {
    for (const m of mutations) {
      const { state, settings } = this.config; // Reverse Bind: DOM -> State
      if (m.type === "childList") {
        const nodes = [...m.addedNodes, ...m.removedNodes];
        if (nodes.some(({ nodeName: nm }) => nm === "SOURCE")) state.sources = getSources(this.el);
        if (nodes.some(({ nodeName: nm }) => nm === "TRACK")) state.tracks = getTracks(this.el);
      } else if (m.type !== "attributes" || !m.attributeName) return;
      switch (m.attributeName) {
        case "poster":
          return void (state.poster = (this.el as HTMLVideoElement).poster);
        case "autoplay":
          return void (state.autoplay = this.el.autoplay);
        case "loop":
          return void (state.loop = this.el.loop);
        case "preload":
          return void (state.preload = this.el.preload);
        case "crossorigin":
          return void (state.crossOrigin = this.el.crossOrigin);
        case "controls":
          return void (state.controls = this.el.controls);
        case "playsinline":
        case "webkit-playsinline":
          return void (state.playsInline = this.el.playsInline);
        case "controlslist":
          return void (state.controlsList = this.el.controlsList ?? this.el.getAttribute(m.attributeName));
        case "disablepictureinpicture":
          return void (state.disablePictureInPicture = this.el.disablePictureInPicture ?? this.el.hasAttribute(m.attributeName));
        case "muted":
          return void ((state.muted = this.el.muted), (settings.defaultMuted = this.el.defaultMuted));
      }
    } // Mutations report before Queued MicroTasks so double "state.*" sets is safely batched for `on` listeners :)
  }
  // --- Feature Intents ---
  protected handleVolumeIntent(e: REvent<CtlrMedia, "intent.volume">): void {
    if (e.resolved) return;
    this.el.volume = e.value / 100;
    e.resolve(HTML5Tech.techName);
  }
  protected handleMutedIntent(e: REvent<CtlrMedia, "intent.muted">): void {
    if (e.resolved) return;
    this.el.muted = e.value;
    e.resolve(HTML5Tech.techName);
  }
  protected handlePlaybackRateIntent(e: REvent<CtlrMedia, "intent.playbackRate">): void {
    if (e.resolved) return;
    this.el.playbackRate = e.value;
    e.resolve(HTML5Tech.techName);
  }
  protected handlePiPIntent(e: REvent<CtlrMedia, "intent.pictureInPicture">): void {
    if (e.resolved) return;
    (e.value ? (this.el as HTMLVideoElement).requestPictureInPicture() : document.exitPictureInPicture())?.catch((err) => this.ctlr.log(err, "error"));
    e.resolve(HTML5Tech.techName);
  }
  protected handleFullscreenIntent(e: REvent<CtlrMedia, "intent.fullscreen">): void {
    if (e.resolved) return;
    (e.value ? enterFullscreen(this.el) : exitFullscreen(this.el))?.catch((err) => this.ctlr.log(err, "error"));
    e.resolve(HTML5Tech.techName);
  }
  protected handleCurrentTrackIntent(e: REvent<CtlrMedia, `intent.current${TrackType}Track`>, type: TrackType, list?: any): void {
    if (e.resolved) return;
    setCurrentTrack(this.el, type, e.value, false, list); // (el), (type), (idx), (no flush: `hidden` & !`disabled`)
    e.resolve(HTML5Tech.techName);
  }
  protected handleAttributeIntent(e: REvent<CtlrMedia>, key: string, isBool: boolean, attr = key.toLowerCase()): void {
    if (e.resolved || (key === "poster" && isSameURL(e.value, this.config.state[key]))) return;
    isBool ? this.el.toggleAttribute(attr, Boolean(e.value)) : e.value ? this.el.setAttribute(attr, e.value) : this.el.removeAttribute(attr); // (this.el as any)[key] = isBool ? Boolean(e.value) : (e.value ?? ""); // Generic handler for simple attributes
    if (key === "playsInline") this.el.toggleAttribute("webkit-playsinline", Boolean(e.value));
    e.resolve(HTML5Tech.techName);
  }
  protected handleSourcesIntent(e: REvent<CtlrMedia, "intent.sources">): void {
    if (e.resolved) return;
    if (!isSameSources(this.config.state.sources, e.value)) removeSources(this.el), addSources(e.value, this.el);
    e.resolve(HTML5Tech.techName);
  }
  protected handleTracksIntent(e: REvent<CtlrMedia, "intent.tracks">): void {
    if (e.resolved) return;
    if (!isSameTracks(this.config.state.tracks, e.value)) removeTracks(this.el), addTracks(e.value, this.el);
    e.resolve(HTML5Tech.techName);
  }
  // --- Status (Bulk) ---
  protected handleLoadStatus(): void {
    this.config.status.readyState = this.el.readyState;
    this.config.status.networkState = this.el.networkState;
    this.config.status.buffered = this.el.buffered;
    this.config.status.seekable = this.el.seekable;
  }
  protected handleLoadedMetadataStatus(): void {
    this.config.status.loadedMetadata = true;
    this.config.type === "video" && ((this.config.status.videoWidth = this.config.element.videoWidth), (this.config.status.videoHeight = this.config.element.videoHeight));
    this.config.status.duration = this.el.duration;
    this.handleLoadStatus(); // Update buffers too
  }
  protected handleLoadedDataStatus(): void {
    this.config.status.loadedData = true;
  }
  protected handleCanPlayStatus(): void {
    this.config.status.canPlay = true;
  }
  protected handleCanPlayThroughStatus(): void {
    this.config.status.canPlayThrough = true;
  }
  protected handleStalledStatus(): void {
    this.config.status.stalled = true;
  }
  protected handleWaitingStatus(): void {
    this.config.status.waiting = true;
  }
  protected handlePlayingStatus(): void {
    this.config.status.waiting = this.config.status.stalled = false;
  }
  protected handleErrorStatus(e: any, target = e?.target): void {
    if (target && target !== this.el) return this.ctlr.log({ message: `Media ${target.nodeName || "Child"} element error occured!`, event: e, target }, "warn"); // not an error but u gotta know
    this.config.status.error = this.el.error ?? ({ message: (isStr(e) && e) || e?.message } as MediaError);
    this.config.status.waiting = false;
  }
  protected handleTracksStatus(type: "textTracks" | "videoTracks" | "audioTracks", list: any): void {
    this.config.status[type] = list;
  }
  protected handleActiveCueStatus(e?: globalThis.Event | { target?: TextTrack }, strict = false): void {
    const track = e?.target as TextTrack | null;
    if (strict && getTrackIdx(this.el, "Text", track) !== this.config.state.currentTextTrack) return; // incase of multiple tracks `cuechange`
    this.config.status.activeCue = track?.activeCues?.[0] || null;
  }
  // --- Settings ---
  protected handleDefaultMutedSetting(e: REvent<CtlrMedia, "settings.defaultMuted">): void {
    this.el.defaultMuted = e.value;
  }
  protected handleDefaultPlaybackRateSetting(e: REvent<CtlrMedia, "settings.defaultPlaybackRate">): void {
    this.el.defaultPlaybackRate = e.value;
  }
  // --- Dog Feeders ---
  protected handleDisablePiPState(v: boolean): void {
    this.config.features.pictureInPicture = !v;
  }
}

declare module "@defs/registries" {
  interface TechRegistryMap {
    html5: typeof HTML5Tech;
  }
}
