import { BaseTech } from "./base";
import type { Controller } from "@core/controller";
import type { CtlrMedia, MediaFeatures } from "@defs/contract";
import { inert, type REvent } from "sia-reactor";
import { createEl, loadResource, supportsFullscreen, supportsPictureInPicture } from "@utils/dom";
import { createTimeRanges } from "@utils/time";
import { isSameURL } from "@utils/str";
import { isNum } from "@utils/obj";
import { clamp, isSafeNum } from "@utils/num";
import { MATCH_ID_VIMEO, MATCH_URL_VIMEO } from "@utils/match";
import { setTimeout } from "@utils/fn";
import { getMediaMin, getMediaMax } from "@utils/time";
import type Player from "@vimeo/player";
import type { VimeoAudioTrack, VimeoQuality, VimeoTextTrack } from "@vimeo/player";

export const VIMEO_EVENTS = ["loaded", "play", "playing", "pause", "ended", "timeupdate", "durationchange", "chapterchange", "progress", "seeking", "seeked", "error", "bufferstart", "bufferend", "volumechange", "playbackratechange", "qualitychange", "texttrackchange", "cuechange", "resize", "enterpictureinpicture", "leavepictureinpicture", "fullscreenchange"] as const;

export class VimeoTech extends BaseTech<HTMLIFrameElement> {
  public static readonly techName: string = "vimeo";
  public host: Player | null = null;
  public static override canPlaySource(src: string): boolean {
    return MATCH_URL_VIMEO.test(src);
  }
  public hostDiv: HTMLDivElement;
  public hostHTML = `<div class="tmg-host-content"><iframe class="tmg-foreign-host tmg-vimeo-host" credentialless="true" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
  protected hostSrc: string | null = null;
  constructor(ctlr: Controller, features?: MediaFeatures) {
    // prettier-ignore
    super(ctlr, {
      // Engine Inputs
      volume: true, muted: true, playbackRate: true,
      // Modes
      fullscreen: supportsFullscreen(), pictureInPicture: supportsPictureInPicture(),
      // States
      autoplay: true, loop: true, playsInline: true, controls: true, crossOrigin: true, live: false,
      // Lists
      textTracks: true, audioTracks: true, levels: true,
      // Currents
      currentTextTrack: true, currentAudioTrack: true, currentLevel: true, autoLevel: true,
      // Infos
      readyState: true, error: true, waiting: true, seeking: true, buffered: true, seekable: true,
      loadedMetadata: true, loadedData: true, canPlay: true, canPlayThrough: true, activeCues: true, 
      // Settings
      metadata: true, liveTolerance: true, minDVRWindow: true,  ...features
    });
    ctlr.config.mediaPlayer = "Vimeo"; // You can't say, I never did nothing for you
    this.element = this.hostDiv = createEl("div", { className: `tmg-host-div ${this.el.className}`, innerHTML: this.hostHTML }) as HTMLIFrameElement; // for tech.element replaceWith
    ctlr.media.status.hostReady = false;
  }
  // --- API Injection ---
  protected async initHost(url: string): Promise<void> {
    try {
      this.destroyHost(); // Vimeo prefers a fresh iframe for new URLs to ensure clean state
      if (!(window as any).Vimeo) await loadResource(window.TMG_VIMEO_API_SRC!, "script");
      if (!this.signal || this.signal?.aborted) return; // src may have changed during the `await`
      const truth = this.config[this.ctlr.techTruth],
        [, id = "", h = ""] = url.match(MATCH_ID_VIMEO) || [];
      this.element = this.hostDiv.querySelector("iframe")!;
      this.el.src = `https://player.vimeo.com/video/${id}?${new URLSearchParams({ autoplay: +(truth.autoplay || !truth.paused), controls: +truth.controls, loop: +truth.loop, muted: +truth.muted, playsinline: +truth.playsInline, dnt: truth.crossOrigin === "use-credentials" ? 0 : 1, transparent: 1, pip: 1, h } as any).toString()}`; // Do Not Track = Privacy Mode
      this.host = new (window as any).Vimeo.Player(this.el, { url: (this.hostSrc = url) }) as Player;
      for (const e of VIMEO_EVENTS) this.host.on(e, (data) => this.handleHostStateChange(e, data)); // EXHAUSTIVE EVENT ROUTING: Mapping every documented Vimeo event
      await this.host.ready(), (this.config.status.hostReady = true);
      this.setInitInfo();
    } catch (err) {
      this.handleHostError(err);
    }
  }
  // ===========================================================================
  // WIRING (Connections Only)
  // ===========================================================================
  // --- Core Wiring ---
  protected override wireSrc(): void {
    this.config.on("intent.src", this.handleSrcIntent, this.evtOpts.CONFIG);
  }
  protected override wireCurrentTime(): void {
    this.config.set("intent.currentTime", (t, _, __, d = this.config.status.duration) => (isSafeNum(d) ? clamp(0, t, d - 1) : t), this.evtOpts.CONFIG); // #PAMPERING: observed quirks
    this.config.on("intent.currentTime", this.handleCurrentTimeIntent, this.evtOpts.CONFIG);
  }
  protected override wireDuration(): void {}
  protected override wirePaused(): void {
    this.config.on("intent.paused", this.handlePausedIntent, this.evtOpts.CONFIG);
  }
  // --- Engine Inputs Wiring ---
  protected override wireEnded(): void {}
  protected wireVolume(): void {
    this.config.on("intent.volume", this.handleVolumeIntent, this.evtOpts.CONFIG);
  }
  protected wireMuted(): void {
    this.config.on("intent.muted", this.handleMutedIntent, this.evtOpts.CONFIG);
  }
  protected wirePlaybackRate(): void {
    this.config.on("intent.playbackRate", this.handlePlaybackRateIntent, this.evtOpts.CONFIG);
  }
  // --- Presentation Modes Wiring ---
  protected wireFullscreen(): void {
    this.config.on("intent.fullscreen", this.handleFullscreenIntent, this.evtOpts.CONFIG);
  }
  protected wirePictureInPicture(): void {
    this.config.on("intent.pictureInPicture", this.handlePictureInPictureIntent, this.evtOpts.CONFIG);
  }
  // --- Attributes Wiring ---
  protected wireLoop(): void {
    this.config.on("intent.loop", this.handleLoopIntent, this.evtOpts.CONFIG);
  }
  // --- Track Switching Wiring ---
  protected wireCurrentChapter(): void {
    this.config.set("intent.currentChapter", (term) => (isNum(term) ? term : this.config.settings.metadata.chapterInfo.findIndex((c) => c.title === term || c.startTime === term || c.artwork === term)), { signal: this.signal }); // #VALIDATOR: intent type conformation
    this.config.on("intent.currentChapter", this.handleCurrentChapterIntent, this.evtOpts.CONFIG);
  }
  protected wireCurrentTextTrack(): void {
    this.config.set("intent.currentTextTrack", (term) => (isNum(term) ? term : (this.config.status.textTracks as VimeoTextTrack[]).findIndex((t) => t.language === term && t.kind === term)), { signal: this.signal });
    this.config.on("intent.currentTextTrack", this.handleCurrentTextTrackIntent, this.evtOpts.CONFIG);
  }
  protected wireCurrentAudioTrack(): void {
    this.config.set("intent.currentAudioTrack", (term) => (isNum(term) ? term : (this.config.status.audioTracks as VimeoAudioTrack[]).findIndex((t) => t.language === term && t.kind === term)), { signal: this.signal });
    this.config.on("intent.currentAudioTrack", this.handleCurrentAudioTrackIntent, this.evtOpts.CONFIG);
  }
  protected wireCurrentLevel(): void {
    this.config.set("intent.currentLevel", (term) => (isNum(term) ? term : Number(term)), { signal: this.signal });
    this.config.on("intent.currentLevel", this.handleCurrentLevelIntent, this.evtOpts.CONFIG);
  }
  protected wireAutoLevel(): void {
    this.config.on("intent.autoLevel", this.handleAutoLevelIntent, this.evtOpts.CONFIG);
  }
  // --- Live Content Wiring ---
  protected wireLive(): void {
    this.config.on("intent.live", this.handleLiveIntent, this.evtOpts.CONFIG);
    this.config.watch("status.isLive", this.onIsLiveStatus, this.evtOpts.CONFIG);
  }
  // ===========================================================================
  // HANDLERS (The Logic - Auto-Guarded)
  // ===========================================================================
  // --- Core Intents ---
  protected handleSrcIntent(e: REvent<CtlrMedia, "intent.src">): void {
    if (e.resolved || isSameURL(this.hostSrc, e.value)) return;
    this.resetLoadInfo(); // Optimistic UI
    this.initHost(e.value);
    e.resolve(this.name);
  }
  protected handleCurrentTimeIntent(e: REvent<CtlrMedia, "intent.currentTime">): void {
    if (e.resolved) return;
    this.when("loadedMetadata", e, (min = getMediaMin(this.config), max = getMediaMax(this.config)) => {
      if (e.value < min! || e.value > max!) e.reject(this.name); // Out of bounds
      this.host!.setCurrentTime(clamp(min, e.value, max)).catch((err) => this.ctlr.log(err, "error", true)); // #LESS: error not worth notifying
    });
    e.resolve(this.name);
  }
  protected handlePausedIntent(e: REvent<CtlrMedia, "intent.paused">): void {
    if (e.resolved) return;
    this.when("hostReady", e, () => (e.value ? this.host!.pause() : this.host!.play()).catch((err) => this.ctlr.log(err, "error", true))); // #LESS: error not worth notifying
    e.resolve(this.name);
  }
  // --- Feature Intents ---
  protected handleVolumeIntent(e: REvent<CtlrMedia, "intent.volume">): void {
    if (e.resolved) return;
    if (e.value < 0 || e.value > 100) e.reject(this.name); // Out of bounds; Vimeo uses 0-1
    this.when("hostReady", e, () => this.host!.setVolume(clamp(0, e.value / 100, 1)).catch((err) => this.ctlr.log(err, "error", true))); // #LESS: error not worth notifying
    e.resolve(this.name);
  }
  protected handleMutedIntent(e: REvent<CtlrMedia, "intent.muted">): void {
    if (e.resolved) return;
    this.when("hostReady", e, () => this.host!.setMuted(e.value).catch((err) => this.ctlr.log(err, "error", true))); // #LESS: error not worth notifying
    e.resolve(this.name);
  }
  protected handlePlaybackRateIntent(e: REvent<CtlrMedia, "intent.playbackRate">): void {
    if (e.resolved) return;
    this.when("hostReady", e, () => this.host!.setPlaybackRate(e.value).catch((err) => this.ctlr.log(err, "error", true))); // #LESS: error not worth notifying
    e.resolve(this.name);
  }
  protected handleFullscreenIntent(e: REvent<CtlrMedia, "intent.fullscreen">): void {
    if (e.resolved) return;
    this.when("hostReady", e, () => (e.value ? this.host!.requestFullscreen() : this.host!.exitFullscreen())?.catch(this.ctlr.notice));
    e.resolve(this.name);
  }
  protected handlePictureInPictureIntent(e: REvent<CtlrMedia, "intent.pictureInPicture">): void {
    if (e.resolved) return;
    this.when("hostReady", e, () => (e.value ? this.host!.requestPictureInPicture() : this.host!.exitPictureInPicture()).catch(this.ctlr.notice));
    e.resolve(this.name);
  }
  protected handleLoopIntent(e: REvent<CtlrMedia, "intent.loop">): void {
    if (e.resolved) return;
    // prettier-ignore
    this.when("hostReady", e, () => this.host!.setLoop(e.value).then(() => (this.config.state.loop = e.value), (err) => this.ctlr.log(err, "error", true))); // #LESS: error not worth notifying
    e.resolve(this.name);
  }
  protected handleCurrentTextTrackIntent(e: REvent<CtlrMedia, "intent.currentTextTrack">): void {
    if (e.resolved) return;
    this.when("loadedMetadata", e, (track = (this.config.status.textTracks as VimeoTextTrack[])[e.value as number]) => (track ? this.host!.enableTextTrack(track.language, track.kind) : this.host!.disableTextTrack()).catch((err) => this.ctlr.log(err, "error", true))); // #VALIDATED: mediated for cast conformity; no-opy  // #LESS: error not worth notifying
    e.resolve(this.name);
  }
  protected handleCurrentAudioTrackIntent(e: REvent<CtlrMedia, "intent.currentAudioTrack">): void {
    if (e.resolved) return;
    // prettier-ignore
    this.when("loadedMetadata", e, (track = (this.config.status.audioTracks as VimeoAudioTrack[])[e.value as number]) => track && this.host!.selectAudioTrack(track.language, track.kind).then(() => (this.config.state.currentAudioTrack = e.value as number), (err) => this.ctlr.log(err, "error", true))); // #VALIDATED: mediated for cast conformity; no-opy // #LESS: error not worth notifying
    e.resolve(this.name);
  }
  protected handleCurrentLevelIntent(e: REvent<CtlrMedia, "intent.currentLevel">): void {
    if (e.resolved) return;
    this.when("loadedMetadata", e, (quality = (this.config.status.levels as VimeoQuality[])[e.value as number]) => quality && (this.useAutoLevel(), this.host!.setQuality(quality.id).catch((err) => this.ctlr.log(err, "error", true)))); // #VALIDATED: mediated for cast conformity; no-opy // #BULLET-PROOF: must comes clutch // #LESS: error not worth notifying
    e.resolve(this.name);
  }
  protected handleAutoLevelIntent(e: REvent<CtlrMedia, "intent.autoLevel">): void {
    if (e.resolved) return;
    this.when("loadedMetadata", e, () => this.useAutoLevel(e.value));
    e.resolve(this.name);
  }
  protected useAutoLevel(value = false): void {
    this.host!.setQuality(value ? "auto" : (this.config.status.levels as VimeoQuality[])[0]?.id).catch((err) => this.ctlr.log(err, "error", true)); // #LESS: error not worth notifying
  }
  protected handleLiveIntent(e: REvent<CtlrMedia, "intent.live">): void {
    if (e.resolved) return;
    this.when("loadedMetadata", e, (seekable = this.config.status.seekable) => e.value && seekable.length && (this.config.intent.currentTime = seekable.end(seekable.length - 1) - 1)); // #FACADED: silenced intent actual op
    e.resolve(this.name);
  }
  // --- Dog Feeders ---
  protected onIsLiveStatus(v: boolean): void {
    this.config.features.live = v;
  }
  // --- API Exhaustive Logic ---
  private durationSeq = 0;
  private durationSrc = "";
  protected handleHostStateChange(evt: (typeof VIMEO_EVENTS)[number], data: any): void {
    const { state: s, status: st, settings: set } = this.config;
    // console.log("Vimeo Event:", evt, data);
    switch (evt) {
      case "loaded":
        this.setInitInfo();
        setTimeout(
          () => {
            st.waiting = false; // UX boost
            st.readyState = 2; // HAVE METADATA & CURRENT DATA
            st.canPlay = st.loadedData = true;
          },
          100, // effects of promise abuse
          this.signal
        ); // stall due to promises
        break;
      case "playing":
      case "play":
        st.readyState = 4; // HAVE ENOUGH DATA
        st.ended = s.paused = false;
        if (evt !== "playing") break;
        st.stalled = st.waiting = false;
        st.error = null; // UX boost
        break;
      case "pause":
        s.paused = true;
        this.host!.getPlayed().then((played) => (st.played = createTimeRanges(played)));
        if (!set.idleWaiting) st.waiting = false;
        break;
      case "ended":
        return void (s.paused = st.ended = true);
      case "timeupdate":
        s.currentTime = data.seconds;
        if (st.isLive)
          if (st.seekable.length) {
            const max = st.seekable.end(st.seekable.length - 1);
            st.canSeekLive = max - st.seekable.start(0) >= this.config.settings.minDVRWindow;
            s.live = max - s.currentTime <= this.config.settings.liveTolerance;
          } else s.live = !(st.canSeekLive = false);
        else st.ended = s.currentTime === st.duration; // UX boost
        break;
      case "durationchange":
        if (this.hostSrc !== this.durationSrc) (this.durationSeq = 0), (this.durationSrc = this.hostSrc!);
        const prev = st.duration;
        if ((st.duration = data.duration) === Infinity) return void (st.isLive = true);
        prev !== Infinity && prev > 0 && st.duration > prev && ++this.durationSeq > 3 ? (st.isLive = true) : (st.isLive = s.live = false); // UX boost
        break;
      case "progress":
        this.host!.getBuffered().then((buffered) => (st.buffered = createTimeRanges(buffered)));
        this.host!.getSeekable().then((seekable) => (st.seekable = createTimeRanges(seekable)));
        break;
      case "seeking":
        st.seeking = true;
        this.host!.getPlayed().then((played) => (st.played = createTimeRanges(played)));
        break;
      case "seeked":
        s.currentTime = data.seconds; // UX boost
        st.seeking = false;
        break;
      case "bufferstart":
        st.waiting = set.idleWaiting || !s.paused;
        st.readyState = 2; // HAVE CURRENT DATA
        break;
      case "bufferend":
        st.waiting = false;
        st.readyState = 4; // HAVE ENOUGH DATA
        break;
      case "volumechange":
        s.volume = data.volume * 100;
        this.host!.getMuted().then((muted) => (s.muted = muted)); // Safety check instead of assuming 0
        break;
      case "playbackratechange":
        return void (s.playbackRate = data.playbackRate);
      case "texttrackchange":
        return void (s.currentTextTrack = (st.textTracks as VimeoTextTrack[]).findIndex((t) => t.language === data.language && t.kind === data.kind));
      case "cuechange":
        return void (st.activeCues = data.cues || null);
      case "chapterchange":
        s.currentChapter = data.index - 1;
        break;
      case "qualitychange":
        s.currentLevel = (st.levels as VimeoQuality[]).findIndex((q) => q.id === data.quality);
        this.host!.getQuality().then((q) => (s.autoLevel = q === "auto" || !q));
        break;
      case "resize":
        return void ((st.videoWidth = data.videoWidth), (st.videoHeight = data.videoHeight));
      case "enterpictureinpicture":
        return void (s.pictureInPicture = true);
      case "leavepictureinpicture":
        return void (s.pictureInPicture = false);
      case "fullscreenchange":
        return void (s.fullscreen = data.fullscreen);
      case "error":
        return void (data.method || this.errSnublist.includes(data.name) ? this.ctlr.log(`Vimeo ${data.name} occurred: ${data.message}`, "error", true) : this.handleHostError(data)); // RangeError for out-of-range seeks and TypeError for invalid API calls
    }
  }
  public errSnublist = ["Error", "RangeError", "TypeError"];
  protected handleHostError(err: any): void {
    if (!this.signal || this.signal?.aborted) return;
    this.config.status.error = { ...err, code: err?.code ?? 5, message: err?.message || "Vimeo Video Not Found." }; // 5 = MEDIA_ERR_UNKNOWN to allow mssg fallback
    this.config.status.waiting = false;
  }
  // --- Lifecycle ---
  protected async setInitInfo(): Promise<void> {
    if (!this.host || !this.config.status.hostReady) return;
    // Status (Infos & Lists)
    this.host.getDuration().then((duration) => (this.config.status.isLive = (this.config.status.duration = duration) === Infinity));
    this.host.getPlayed().then((played) => (this.config.status.played = createTimeRanges(played)));
    this.host.getBuffered().then((buffered) => (this.config.status.buffered = createTimeRanges(buffered)));
    this.host.getSeekable().then((seekable) => (this.config.status.seekable = createTimeRanges(seekable)));
    this.host.getChapters().then((chapters, _meta = this.config.settings.metadata) => _meta.allowMediaOverride && (_meta.chapterInfo = inert(chapters)));
    this.host.getTextTracks().then((tracks) => (this.config.status.textTracks = inert(tracks)));
    this.host.getAudioTracks().then((tracks) => (this.config.status.audioTracks = inert(tracks)));
    this.host.getQualities().then((qualities) => {
      this.config.status.levels = inert(qualities.filter((q) => q.id !== "auto"));
      this.config.state.currentLevel = (this.config.status.levels as VimeoQuality[]).findIndex((q) => q.active);
      this.config.state.autoLevel = qualities.find((q) => q.active)?.id === "auto";
    });
    Promise.all([this.host.getVideoWidth(), this.host.getVideoHeight()]).then(([w, h]) => ((this.config.status.videoWidth = w), (this.config.status.videoHeight = h))); // Fixed the comma-operator bug here
    // Post Init
    this.autoChapters = !this.config.settings.metadata.allowMediaOverride; // maybe chapter "cuechange" over to u; truth
  }
  protected destroyHost(): void {
    if (!this.host) return;
    this.host.destroy(), (this.host = null), (this.config.status.hostReady = false);
    (this.element = this.hostDiv as HTMLIFrameElement).innerHTML = this.hostHTML; // Reset to placeholder
  }
  protected override onDestroy(): void {
    this.destroyHost(), super.onDestroy();
  }
}

declare module "@defs/registries" {
  interface TechRegistryMap {
    vimeo: typeof VimeoTech;
  }
}
