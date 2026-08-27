import { BaseTech } from "./base";
import { type REvent, inert } from "sia-reactor";
import type { Controller } from "@core/controller";
import type { CtlrMedia, MediaIntent, MediaFeatures } from "@defs/contract";
import type { Source, Track } from "@defs/generics";
import { AUDIO_EXTENSIONS, HLS_EXTENSIONS, VIDEO_EXTENSIONS } from "@utils/match";
import { MSE_ENABLED } from "@utils/env";
import { isStr } from "@utils/obj";
import type { TrackType } from "@utils/media";
import { enterFullscreen, exitFullscreen, queryFullscreenEl, supportsFullscreen, supportsPictureInPicture } from "@utils/dom";
import { observeMutation, createListRenderer as renderList } from "@utils/dom";
import { getTrackIdx, setCurrentTrack, canUseVolume, canMuteVolume, canUseRate, canTextTracks, canVideoTracks, canAudioTracks, getSources, getTracks, isSameSources, isSameTracks, DUMMY_VID } from "@utils/media";
import { getMediaMax, getMediaMin } from "@utils/time";
import { isSameURL, cleanURL } from "@utils/str";
import { clamp } from "@utils/num";
import { silence } from "sia-reactor/modules";
import { assignEl, createEl, force } from "sia-reactor/utils";

export class HTML5Tech extends BaseTech<HTMLMediaElement> {
  public static readonly techName: string = "html5";
  public static override canPlaySource(src: string): boolean {
    return VIDEO_EXTENSIONS.test(src) || AUDIO_EXTENSIONS.test(src) || !!(!MSE_ENABLED && DUMMY_VID.canPlayType("application/vnd.apple.mpegurl") && HLS_EXTENSIONS.test(src)); // Safari has native HLS support, but only if MSE is not available (iOS)
  }
  protected readonly isAlien: boolean = false;
  constructor(ctlr: Controller, features?: MediaFeatures) {
    // prettier-ignore
    const isAudio = ctlr.media.type === "audio", canTxtTrack = canTextTracks(ctlr.media.type), canVidTrack = !isAudio && canVideoTracks(ctlr.media.type), canAudTrack = canAudioTracks(ctlr.media.type);
    // prettier-ignore
    super(ctlr, {
      // Kinda Core
      volume: canUseVolume(ctlr.media.type), muted: canMuteVolume(ctlr.media.type), playbackRate: canUseRate(ctlr.media.type),
      // Modes
      pictureInPicture: !isAudio && supportsPictureInPicture() && !ctlr.media.state.disablePictureInPicture, fullscreen: !isAudio && supportsFullscreen(),
      // Markup & States
      poster: !isAudio, autoplay: true, loop: true, playsInline: !isAudio, preload: true, crossOrigin: true, 
      controls: true, controlsList: true, disablePictureInPicture: true, sources: true, tracks: true, live: false,
      // Lists
      textTracks: canTxtTrack, videoTracks: !isAudio && canVidTrack, audioTracks: canAudTrack,
      // Currents
      currentChapter: canTxtTrack, currentTextTrack: canTxtTrack, currentVideoTrack: canVidTrack, currentAudioTrack: canAudTrack, textVisible: canTxtTrack, activeCues: canTxtTrack,
      // Infos
      readyState: true, networkState: true, error: true, waiting: true, stalled: true,
      seeking: true, buffered: true, played: true, seekable: true, videoWidth: !isAudio, videoHeight: !isAudio, 
      loadedMetadata: true, loadedData: true, canPlay: true, canPlayThrough: true, isLive: true, canSeekLive: true,
      // Settings
      defaultMuted: true, defaultPlaybackRate: true, srcObject: true, metadata: canTxtTrack, liveTolerance: true, minDVRWindow: true, ...features,
    });
    ctlr.media.status.hostReady = true; // always active!
  }
  // ===========================================================================
  // WIRING (Connections Only)
  // ===========================================================================
  // --- Core Wiring ---
  protected override wireSrc(): void {
    this.el.addEventListener("loadstart", this.resetLoadInfo, this.evtOpts.EL);
    this.config.on("intent.src", this.handleSrcIntent, this.evtOpts.CONFIG);
  }
  protected override wireCurrentTime(): void {
    this.el.addEventListener("timeupdate", this.setTimeUpdateState, this.evtOpts.EL);
    this.el.addEventListener("seeking", this.setSeekingState, this.evtOpts.EL);
    this.el.addEventListener("seeked", this.setSeekedState, this.evtOpts.EL);
    this.config.get("state.currentTime", (v) => (this.el.readyState < 1 ? v : this.el.currentTime), { signal: this.signal }); // #VIRTUAL: reliable return value, for those faster than the spec
    this.config.on("intent.currentTime", this.handleCurrentTimeIntent, this.evtOpts.CONFIG);
  }
  protected override wireDuration(): void {
    this.el.addEventListener("durationchange", this.setDurationChangeState, this.evtOpts.EL);
  }
  protected override wirePaused(): void {
    this.el.addEventListener("play", this.setPlayState, this.evtOpts.EL);
    this.el.addEventListener("pause", this.setPauseState, this.evtOpts.EL);
    this.config.get("state.paused", () => this.el.paused, { signal: this.signal }); // #VIRTUAL: reliable return value
    this.config.on("intent.paused", this.handlePausedIntent, this.evtOpts.CONFIG);
  }
  protected override wireEnded(): void {
    this.el.addEventListener("ended", this.setPlayState, this.evtOpts.EL);
  }
  // --- Features Wiring ---
  protected override wireFeatures(): void {
    super.wireFeatures(); // Calls individual feature wires (volume, etc.) above
    this.wireHTMLState(); // Attributes Reverse-Sync (Mutation Observer)
    // Status (Bulk wiring)
    for (const e of ["progress", "suspend", "abort", "emptied", "stalled"]) this.el.addEventListener(e, this.handleLoadingStatus, this.evtOpts.EL);
    this.el.addEventListener("loadedmetadata", this.handleLoadedMetadataStatus, this.evtOpts.EL);
    this.el.addEventListener("loadeddata", this.handleLoadedDataStatus, this.evtOpts.EL);
    this.el.addEventListener("canplay", this.handleCanPlayStatus, this.evtOpts.EL);
    this.el.addEventListener("canplaythrough", this.handleCanPlayThroughStatus, this.evtOpts.EL);
    this.el.addEventListener("playing", this.handlePlayingStatus, this.evtOpts.EL);
    this.el.addEventListener("waiting", this.handleWaitingStatus, this.evtOpts.EL);
    this.el.addEventListener("stalled", this.handleStalledStatus, this.evtOpts.EL);
    this.el.addEventListener("error", this.handleErrorStatus, this.evtOpts.EL);
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
    this.config.on("intent.pictureInPicture", this.handlePictureInPictureIntent, this.evtOpts.CONFIG);
  }
  protected wireFullscreen(): void {
    this.el.addEventListener("webkitbeginfullscreen", this.setWebkitBeginFullscreenState, this.evtOpts.EL);
    this.el.addEventListener("webkitendfullscreen", this.setWebkitEndFullscreenState, this.evtOpts.EL);
    this.ctlr.state.watch("docInFullscreen", this.setFullscreenChangeState, this.evtOpts.CONFIG);
    this.config.on("intent.fullscreen", this.handleFullscreenIntent, this.evtOpts.CONFIG);
  }
  // --- Track Switching Wiring ---
  protected wireCurrentTrack(type: TrackType): void {
    this.config.set(`intent.current${type}Track`, (term) => getTrackIdx(this.el, type, term, this.config.status[`${type.toLowerCase() as Lowercase<TrackType>}Tracks`]), { signal: this.signal }); // #VALIDATOR: intent type conformation
    (this.el as any)[`${type.toLowerCase()}Tracks`]?.addEventListener("change", () => this.setCurrentTrackState(type), this.evtOpts.EL);
    this.config.on(`intent.current${type}Track`, (e) => this.handleCurrentTrackIntent(e, type), this.evtOpts.CONFIG);
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
  protected wireTextVisible(): void {
    this.config.on("intent.textVisible", this.handleTextVisibleIntent, this.evtOpts.CONFIG);
  }
  // --- HTML (Bulk Wiring) ---
  protected wireHTMLState(): void {
    observeMutation(this.el, this.setHTMLStateFromMutation, { attributes: true, childList: true, subtree: false }, this.signal);
  }
  // --- Attribute Wiring ---
  protected bindAttribute<K extends keyof MediaIntent>(key: K, isBool = false): void {
    this.config.on(`intent.${key}` as any, (e) => this.handleAttributeIntent(e, key, isBool), this.evtOpts.CONFIG); // non-casted union reached peak ts complexity :)
  }
  protected wirePoster(): void {
    this.bindAttribute("poster");
  }
  protected wireAutoplay(): void {
    this.bindAttribute("autoplay", true);
  }
  protected wireLoop(): void {
    this.bindAttribute("loop", true);
  }
  protected wirePreload(): void {
    this.bindAttribute("preload");
  }
  protected wirePlaysInline(): void {
    this.bindAttribute("playsInline", true);
  }
  protected wireCrossOrigin(): void {
    this.bindAttribute("crossOrigin");
  }
  protected wireControls(): void {
    this.bindAttribute("controls", true);
  }
  protected wireControlsList(): void {
    this.bindAttribute("controlsList");
  }
  protected wireDisablePictureInPicture(): void {
    this.bindAttribute("disablePictureInPicture", true);
    this.config.watch("state.disablePictureInPicture", this.onDisablePiPState);
  }
  // --- Lists Wiring ---
  protected wireSources(): void {
    this.config.on("intent.sources", this.handleSourcesIntent, this.evtOpts.CONFIG);
  }
  protected wireTracks(): void {
    this.config.on("intent.tracks", this.handleTracksIntent, this.evtOpts.CONFIG);
  }
  // --- Status Tracks Wiring ---
  protected wireMediaTracks(type: TrackType, list = (this.el as any)[`${type.toLowerCase()}Tracks`]): void {
    if (list) for (const e of ["addtrack", "removetrack"]) list.addEventListener(e, () => this.handleTracksStatus(type, list), this.evtOpts.EL);
    list && this.handleTracksStatus(type, list, true);
  }
  protected wireTextTracks(): void {
    this.wireMediaTracks("Text");
  }
  protected wireAudioTracks(): void {
    this.wireMediaTracks("Audio");
  }
  protected wireVideoTracks(): void {
    this.wireMediaTracks("Video");
  }
  // --- Active Cue Wiring ---
  protected textTrack: TextTrack | null = null;
  protected wireActiveCues(): void {
    const onChange = () => {
      const track = !this.isAlien ? this.config.status.textTracks[this.config.state.currentTextTrack] : this.alienTextTrack;
      this.textTrack !== track && this.textTrack?.removeEventListener("cuechange", this.handleActiveCuesChange, this.evtOpts.EL);
      (this.textTrack = track)?.addEventListener("cuechange", this.handleActiveCuesChange, this.evtOpts.EL), this.handleActiveCuesChange({ target: track });
    };
    this.config.on("state.currentTextTrack", onChange, this.evtOpts.CONFIG), this.config.on("status.textTracks", onChange, this.evtOpts.CONFIG);
    if (this.isAlien) for (const evt of ["change"] as const) this.el.textTracks.addEventListener(evt, onChange, this.evtOpts.EL); // , "addtrack", "removetrack"
  }
  protected get alienTextTrack(): TextTrack | null {
    return Array.prototype.find.call(this.el.textTracks, (t) => t.mode === "showing") || null;
  }
  protected chapterTrack: TextTrack | null = null;
  protected wireChapterCue(track: TextTrack): void {
    if (this.chapterTrack && this.chapterTrack !== track) this.chapterTrack.removeEventListener("cuechange", this.handleChapterCueChange, this.evtOpts.EL);
    (this.chapterTrack = track).addEventListener("cuechange", this.handleChapterCueChange, this.evtOpts.EL), this.handleChapterCueChange({ target: track });
  }
  // --- Live Content Wiring ---
  protected wireLive(): void {
    this.config.on("intent.live", this.handleLiveIntent, this.evtOpts.CONFIG);
    this.config.watch("status.isLive", this.onIsLiveStatus, this.evtOpts.CONFIG);
  }
  // --- Settings Wiring ---
  protected wireDefaultMuted(): void {
    this.config.on("settings.defaultMuted", this.handleDefaultMutedSetting, this.evtOpts.CONFIG);
  }
  protected wireDefaultPlaybackRate(): void {
    this.config.on("settings.defaultPlaybackRate", this.handleDefaultPlaybackRateSetting, this.evtOpts.CONFIG);
  }
  protected wireSrcObject(): void {
    this.config.on("settings.srcObject", this.handleSrcObjectSetting, this.evtOpts.CONFIG);
  }
  // ===========================================================================
  // HANDLERS (The Logic - Auto-Guarded)
  // ===========================================================================
  // --- Core States ---
  protected setTimeUpdateState(): void {
    const { status: st, settings: set, state: s } = this.config;
    s.currentTime = this.el.currentTime;
    if (st.isLive)
      if (st.seekable.length) {
        const max = st.seekable.end(st.seekable.length - 1);
        st.canSeekLive = max - st.seekable.start(0) >= set.minDVRWindow;
        s.live = max - s.currentTime <= set.liveTolerance;
      } else s.live = !(st.canSeekLive = false);
    else this.config.status.ended = this.el.currentTime === this.el.duration; // UX boost
  }
  protected setSeekingState(): void {
    this.config.status.seeking = true;
    force(() => (this.config.status.played = this.el.played));
  }
  protected setSeekedState(): void {
    this.config.status.seeking = false;
  }
  private durationSeq = 0;
  private durationSrc = "";
  protected setDurationChangeState(): void {
    if (this.el.currentSrc !== this.durationSrc) (this.durationSeq = 0), (this.durationSrc = this.el.currentSrc);
    const prev = this.config.status.duration;
    if ((this.config.status.duration = this.el.duration) === Infinity) return void (this.config.status.isLive = true);
    prev !== Infinity && prev > 0 && this.el.duration > prev && ++this.durationSeq > 3 ? (this.config.status.isLive = true) : (this.config.status.isLive = this.config.state.live = false); // UX boost
  }
  protected setPlayState(): void {
    (this.config.state.paused = this.el.paused), (this.config.status.ended = this.el.ended);
  }
  protected setPauseState(): void {
    this.setPlayState(), force(() => (this.config.status.played = this.el.played));
    if (!this.config.settings.idleWaiting) this.config.status.waiting = false; // UX boost
  }
  // --- Core Intents ---
  protected handleSrcIntent(e: REvent<CtlrMedia, "intent.src">): void {
    if (e.resolved || (this.wired && isSameURL(this.el.src, e.value))) return;
    this.el.src = e.value;
    e.resolve(this.name);
  }
  protected handleCurrentTimeIntent(e: REvent<CtlrMedia, "intent.currentTime">): void {
    if (e.resolved) return;
    this.when("loadedData", e, (min = getMediaMin(this.config), max = getMediaMax(this.config)) => {
      if (e.value < min || e.value > max) e.reject(this.name); // Out of bounds
      this.el.currentTime = clamp(min, e.value, max);
    }); // tested nd trusted status due to reactive dynamics
    e.resolve(this.name);
  }
  protected handlePausedIntent(e: REvent<CtlrMedia, "intent.paused">): void {
    if (e.resolved) return;
    this.when("loadedMetadata", e, () => (e.value ? this.el.pause() : this.el.play())?.catch?.((err) => this.ctlr?.log(err, "error", true)), this.isAlien && !e.value); // #EYE-SERVICE: hinged only on init // #LESS: error not worth notifying
    e.resolve(this.name);
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
  protected setCurrentTrackState(type: TrackType, list = this.config.status[`${type.toLowerCase() as Lowercase<TrackType>}Tracks`]): void {
    this.config.state[`current${type}Track`] = getTrackIdx(this.el, type, "active", list);
  }
  protected setHTMLStateFromMutation(mutations: MutationRecord[]): void {
    for (const m of mutations) {
      const { state, settings } = this.config; // Reverse Bind: DOM <-> State
      if (m.type === "childList") {
        const nodes = [...m.addedNodes, ...m.removedNodes];
        if (nodes.some(({ nodeName: nm }) => nm === "SOURCE")) state.sources = inert(getSources(this.el));
        if (nodes.some(({ nodeName: nm }) => nm === "TRACK")) state.tracks = inert(getTracks(this.el));
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
    if (e.value < 0 || e.value > 100) e.reject(this.name); // Out of bounds
    this.el.volume = clamp(0, e.value / 100, 1);
    e.resolve(this.name);
  }
  protected handleMutedIntent(e: REvent<CtlrMedia, "intent.muted">): void {
    if (e.resolved) return;
    this.el.muted = e.value;
    e.resolve(this.name);
  }
  protected handlePlaybackRateIntent(e: REvent<CtlrMedia, "intent.playbackRate">): void {
    if (e.resolved) return;
    this.when("loadedMetadata", e, () => (this.el.playbackRate = e.value));
    e.resolve(this.name);
  }
  protected handlePictureInPictureIntent(e: REvent<CtlrMedia, "intent.pictureInPicture">): void {
    if (e.resolved) return;
    this.when("loadedMetadata", e, () => (e.value ? (this.el as HTMLVideoElement).requestPictureInPicture()?.catch(this.ctlr.notice) : document.pictureInPictureElement === this.el && document.exitPictureInPicture()?.catch(this.ctlr.notice)), true); // #EYE-SERVICE: hinged only on init
    e.resolve(this.name);
  }
  protected handleFullscreenIntent(e: REvent<CtlrMedia, "intent.fullscreen">): void {
    if (e.resolved) return;
    (e.value ? enterFullscreen(this.el) : exitFullscreen(this.el))?.catch(this.ctlr.notice);
    e.resolve(this.name);
  }
  protected handleCurrentTrackIntent(e: REvent<CtlrMedia, `intent.current${TrackType}Track`>, type: TrackType): void {
    if (e.resolved) return;
    this.when("loadedMetadata", e, (list = this.config.status[`${type.toLowerCase() as Lowercase<TrackType>}Tracks`]) => {
      if ((e.value as number) >= list.length) return;
      setCurrentTrack(this.el, type, e.value as number, true, list); // #VALIDATED: mediated for cast conformity; no-opy
      this.setCurrentTrackState(type, list); // tracks "change" event not reliable
      if (type === "Text" && e.value === -1) this.config.state.textVisible = false; // UX boost
    });
    e.resolve(this.name);
  }
  protected handleTextVisibleIntent(e: REvent<CtlrMedia, "intent.textVisible">, idx = this.config[this.ctlr.techTruth].currentTextTrack): void {
    if (e.resolved) return;
    this.when("loadedMetadata", e, (iidx = this.config.intent.currentTextTrack) => {
      // prettier-ignore
      if (e.value && this.config.status.textTracks.length && idx === -1) silence(() => (this.config.intent.currentTextTrack = iidx !== -1 ? iidx : !this.isAlien ? Math.max(0, getTrackIdx(this.config.element, "Text", this.config.state.tracks.find((t) => t.default), this.config.status.textTracks)) : 0)); // #BULLET-PROOF: should comes clutch
      if (this.textTrack) this.textTrack.mode = e.value ? "showing" : "hidden";
      this.config.state.textVisible = e.value;
    });
    e.resolve(this.name);
  }
  protected handleAttributeIntent(e: REvent<CtlrMedia>, key: string, isBool: boolean, attr = key.toLowerCase()): void {
    if (e.resolved || (key === "poster" && isSameURL((this.el as HTMLVideoElement).poster, e.value))) return;
    isBool ? this.el.toggleAttribute(attr, Boolean(e.value)) : e.value ? this.el.setAttribute(attr, e.value) : this.el.removeAttribute(attr); // (this.el as any)[key] = isBool ? Boolean(e.value) : (e.value ?? ""); // Generic handler for simple attributes
    if (key === "playsInline") this.el.toggleAttribute("webkit-playsinline", Boolean(e.value));
    e.resolve(this.name);
  }
  private renderSources?: ReturnType<typeof renderList<any>>;
  protected handleSourcesIntent(e: REvent<CtlrMedia, "intent.sources">): void {
    if (e.resolved || isSameSources(Array.from(this.el.querySelectorAll("source")), e.value)) return;
    (this.renderSources ??= renderList<Source, HTMLSourceElement>({ container: this.el, getKey: (s) => `${cleanURL(s.src)}|${s.type}${s.media}`, createNode: (s) => createEl("source", s), updateNode: (el, s) => assignEl(el, s, undefined, undefined, false), initNode: (el, register) => el instanceof HTMLSourceElement && register(`${cleanURL(el.src)}|${el.type}${el.media}`) }))(e.currentTarget.value);
    e.resolve(this.name);
  }
  private renderTracks?: ReturnType<typeof renderList<any>>;
  protected handleTracksIntent(e: REvent<CtlrMedia, "intent.tracks">): void {
    if (e.resolved || isSameTracks(Array.from(this.el.querySelectorAll("track")), e.value)) return;
    (this.renderTracks ??= renderList<Track>({ container: this.el, getKey: (t) => `${cleanURL(t.src)}|${t.kind}|${t.label}|${t.srclang}`, createNode: (t) => createEl("track", t), updateNode: (el, t) => assignEl(el, t, undefined, undefined, false), initNode: (el, register) => el instanceof HTMLTrackElement && register(`${cleanURL(el.src)}|${el.kind}|${el.label}|${el.srclang}|${el.default}`) }))(e.currentTarget.value);
    e.resolve(this.name);
  }
  protected handleLiveIntent(e: REvent<CtlrMedia, "intent.live">): void {
    if (e.resolved) return;
    this.when("loadedMetadata", e, (seekable = this.config.status.seekable) => e.value && seekable.length && (this.config.intent.currentTime = seekable.end(seekable.length - 1) - 1)); // #FACADED: silenced intent actual op
    e.resolve(this.name);
  }
  // --- Status (Bulk) ---
  protected handleLoadingStatus(): void {
    this.config.status.readyState = this.el.readyState;
    this.config.status.networkState = this.el.networkState;
    force(() => ((this.config.status.buffered = this.el.buffered), (this.config.status.seekable = this.el.seekable)));
  }
  protected handleLoadedMetadataStatus(): void {
    (this.config.status.videoWidth = this.config.type === "video" ? this.config.element.videoWidth : 0), (this.config.status.videoHeight = this.config.type === "video" ? this.config.element.videoHeight : 0);
    this.config.status.isLive = (this.config.status.duration = this.el.duration) === Infinity;
    this.handleLoadingStatus(); // Update buffers too
    this.config.status.loadedMetadata = true;
  }
  protected handleLoadedDataStatus(): void {
    this.config.status.loadedData = true;
  }
  protected handleCanPlayStatus(): void {
    this.config.status.canPlay = true;
    this.config.status.waiting = false; // UX boost
  }
  protected handleCanPlayThroughStatus(): void {
    this.config.status.canPlayThrough = true;
  }
  protected handlePlayingStatus(): void {
    this.config.status.stalled = this.config.status.waiting = false;
    this.config.status.error = null; // UX boost
  }
  protected handleWaitingStatus(): void {
    this.config.status.waiting = this.config.settings.idleWaiting || !this.config.state.paused;
  }
  protected handleStalledStatus(): void {
    this.config.status.stalled = true;
  }
  protected handleErrorStatus(e: any, target = e?.target): void {
    if (target && target !== this.el) return this.ctlr?.log({ message: `Media ${target.nodeName || "Child"} element error occurred!`, event: e, target }, "error", true); // not an error but u gotta know
    this.config.status.error = this.el.error ?? { message: (isStr(e) && e) || e?.message };
    this.config.status.waiting = false;
  }
  protected handleTracksStatus(type: TrackType, list: any, init = false): void {
    this.config.status[`${type.toLowerCase() as Lowercase<TrackType>}Tracks`] = Array.prototype.filter.call(list, (t) => (type === "Text" ? t.kind === "subtitles" || t.kind === "captions" : true)); // filter out non-cue text tracks
    type === "Text" && (this.autoChapters = this.config.settings.metadata.allowMediaOverride) && this.handleChaptersStatus(list); // chapter "cuechange" over to u; base
    !init && silence(() => (this.config.intent[`current${type}Track`] = this.config.intent[`current${type}Track`])); // #RE-TRIGGER: sync intent resolution
    !init && type === "Text" && silence(() => (this.config.intent.textVisible = this.config.intent.textVisible)); // #RE-TRIGGER: sync intent resolution
  }
  protected handleChaptersStatus(list = this.el.textTracks): void {
    const track = Array.prototype.find.call(list, (t) => t.kind === "chapters") || null;
    if (!track) return void ((this.config.settings.metadata.chapterInfo = []), (this.config.state.currentChapter = -1));
    if (track.mode === "disabled") track.mode = "hidden"; // ensure cue access
    const extract = () => (this.config.settings.metadata.chapterInfo = track.cues?.length ? inert(Array.from(track.cues, (cue: any) => ({ title: cue.text, startTime: cue.startTime, artwork: [] }))) : []);
    extract(), !track.cues?.length && track.addEventListener("cuechange", extract, { ...this.evtOpts.EL, once: true }), this.wireChapterCue(track);
  }
  protected handleActiveCuesChange(e?: globalThis.Event | { target?: TextTrack }, strict = false, track = e?.target as TextTrack | null): void {
    if (!strict || (track && getTrackIdx(this.el, "Text", track, this.config.status.textTracks) === this.config.state.currentTextTrack)) force(() => (this.config.status.activeCues = track?.activeCues || null)); // incase of multiple tracks `cuechange`
  }
  protected handleChapterCueChange(e?: globalThis.Event | { target?: TextTrack }, track = e?.target as TextTrack | null, cue = track?.activeCues?.[0] || null): void {
    this.config.state.currentChapter = cue ? this.config.settings.metadata.chapterInfo?.findIndex((c) => c.startTime === cue.startTime) ?? -1 : -1;
  }
  // --- Settings ---
  protected handleDefaultMutedSetting(e: REvent<CtlrMedia, "settings.defaultMuted">): void {
    this.el.defaultMuted = e.value;
  }
  protected handleDefaultPlaybackRateSetting(e: REvent<CtlrMedia, "settings.defaultPlaybackRate">): void {
    this.el.defaultPlaybackRate = e.value;
  }
  protected handleSrcObjectSetting(e: REvent<CtlrMedia, "settings.srcObject">): void {
    this.el.srcObject = e.value;
  }
  // --- Dog Feeders ---
  protected onDisablePiPState(v: boolean): void {
    this.config.intent.pictureInPicture = false;
    this.config.features.pictureInPicture = !v;
  }
  protected onIsLiveStatus(v: boolean): void {
    this.config.features.live = v;
  }
  // --- Lifecycle ---
  protected override onDestroy(): void {
    super.onDestroy();
  }
}

declare module "@defs/registries" {
  interface TechRegistryMap {
    html5: typeof HTML5Tech;
  }
}
