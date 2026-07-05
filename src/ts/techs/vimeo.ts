import { BaseTech } from "./base";
import type { Controller } from "@core/controller";
import type { CtlrMedia, MediaFeatures } from "@defs/contract";
import { inert, type REvent } from "sia-reactor";
import { createEl, loadResource, supportsFullscreen, supportsPictureInPicture } from "@utils/dom";
import { createTimeRanges } from "@utils/time";
import { isSameURL } from "@utils/str";
import { isNum } from "@utils/obj";
import { clamp, isSafeNum } from "@utils/num";
import { MATCH_URL_VIMEO } from "@utils/match";
import { setTimeout } from "@utils/fn";
import { getMediaMin, getMediaMax } from "@utils/media";
import type Player from "@vimeo/player";
import type { VimeoAudioTrack, VimeoQuality, VimeoTextTrack } from "@vimeo/player";

export const VIMEO_EVENTS = ["loaded", "play", "playing", "pause", "ended", "timeupdate", "durationchange", "chapterchange", "progress", "seeking", "seeked", "error", "bufferstart", "bufferend", "volumechange", "playbackratechange", "qualitychange", "texttrackchange", "cuechange", "resize", "enterpictureinpicture", "leavepictureinpicture", "fullscreenchange"] as const;

export class VimeoTech extends BaseTech<HTMLIFrameElement> {
  public static readonly techName: string = "vimeo";
  public host: Player | null = null;
  public hostDiv: HTMLDivElement;
  protected hostSrc: string | null = null;
  public static override canPlaySource(src: string): boolean {
    return MATCH_URL_VIMEO.test(src);
  }
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
      loadedMetadata: true, loadedData: true, canPlay: true, canPlayThrough: true, activeCue: true, 
      // Settings
      metadata: true, liveTolerance: true, minDVRWindow: true,  ...features
    });
    ctlr.config.mediaPlayer = "Vimeo"; // You can't say, I never did nothing for you
    this.element = this.hostDiv = createEl("div", { className: `tmg-host-div ${this.el.className}`, innerHTML: `<div class="tmg-host-content"></div>` }) as HTMLIFrameElement; // "now" to maintain the tech.element contract
    ctlr.media.status.hostReady = false;
  }
  // --- API Injection ---
  protected async initHost(url: string) {
    try {
      this.destroyHost(); // Vimeo prefers a fresh iframe for new URLs to ensure clean state
      if (!(window as any).Vimeo) await loadResource(window.TMG_VIMEO_API_SRC!, "script");
      if (this.signal.aborted) return; // src may have changed during the `await`
      const base = this.config[this.ctlr.payload.wired ? "state" : "intent"];
      this.host = new (window as any).Vimeo.Player(this.el.firstElementChild as HTMLElement, {
        url: (this.hostSrc = url),
        autoplay: base.autoplay || !base.paused,
        controls: base.controls,
        loop: base.loop,
        muted: base.muted,
        playsinline: base.playsInline,
        dnt: base.crossOrigin === "use-credentials" ? false : true, // Do Not Track = Privacy Mode
        transparent: true,
        pip: true,
      }) as Player;
      for (const e of VIMEO_EVENTS) this.host.on(e, (data) => this.handleHostStateChange(e, data)); // EXHAUSTIVE EVENT ROUTING: Mapping every documented Vimeo event
      await this.host.ready(), (this.media.status.hostReady = true);
      (this.element = this.el.querySelector("iframe")!), this.el.classList.add("tmg-foreign-host", "tmg-vimeo-host"); // Vimeo inserts a child
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
    this.config.set("intent.currentTextTrack", (term) => (isNum(term) ? term : (this.config.status.textTracks as VimeoTextTrack[]).find((t) => t.language === term && t.kind === term)), { signal: this.signal });
    this.config.on("intent.currentTextTrack", this.handleCurrentTextTrackIntent, this.evtOpts.CONFIG);
  }
  protected wireCurrentAudioTrack(): void {
    this.config.set("intent.currentAudioTrack", (term) => (isNum(term) ? term : (this.config.status.audioTracks as VimeoAudioTrack[]).find((t) => t.language === term && t.kind === term)), { signal: this.signal });
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
  // --- Core States ---
  protected setLoadStartInfo(): void {
    const { state: s, status: st } = this.config;
    st.error = st.activeCue = null;
    st.buffered = createTimeRanges([]);
    st.seekable = createTimeRanges([]);
    st.duration = NaN;
    st.waiting = s.paused = true;
    st.readyState = s.currentTime = 0; // HAVE NOTHING
    st.ended = st.stalled = st.loadedData = st.loadedMetadata = st.canPlay = st.canPlayThrough = false;
  }
  // --- Core Intents ---
  protected handleSrcIntent(e: REvent<CtlrMedia, "intent.src">): void {
    if (e.resolved || isSameURL(this.hostSrc, e.value)) return;
    this.setLoadStartInfo();
    this.initHost(e.value);
    e.resolve(this.name);
  }
  protected handleCurrentTimeIntent(e: REvent<CtlrMedia, "intent.currentTime">): void {
    if (e.resolved) return;
    this.when("loadedData", e, (min = getMediaMin(this.config), max = getMediaMax(this.config)) => {
      if (e.value < min! || e.value > max!) e.reject(this.name); // Out of bounds
      this.host!.setCurrentTime(clamp(min, e.value, max)).catch((err) => this.ctlr.log(err, "error", true));
    });
    e.resolve(this.name);
  }
  protected handlePausedIntent(e: REvent<CtlrMedia, "intent.paused">): void {
    if (e.resolved) return;
    this.when("hostReady", e, () => (e.value ? this.host!.pause() : this.host!.play()).catch((err) => this.ctlr.log(err, "error", true)));
    e.resolve(this.name);
  }
  // --- Feature Intents ---
  protected handleVolumeIntent(e: REvent<CtlrMedia, "intent.volume">): void {
    if (e.resolved) return;
    if (e.value < 0 || e.value > 100) e.reject(this.name); // Out of bounds
    this.when("hostReady", e, () => this.host!.setVolume(clamp(0, e.value / 100, 1)).catch((err) => this.ctlr.log(err, "error", true))); // Vimeo uses 0-1
    e.resolve(this.name);
  }
  protected handleMutedIntent(e: REvent<CtlrMedia, "intent.muted">): void {
    if (e.resolved) return;
    this.when("hostReady", e, () => this.host!.setMuted(e.value).catch((err) => this.ctlr.log(err, "error", true))); // Restored correct Mute API
    e.resolve(this.name);
  }
  protected handlePlaybackRateIntent(e: REvent<CtlrMedia, "intent.playbackRate">): void {
    if (e.resolved) return;
    this.when("hostReady", e, () => this.host!.setPlaybackRate(e.value).catch((err) => this.ctlr.log(err, "error", true)));
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
    this.when("hostReady", e, () => this.host!.setLoop(e.value).catch((err) => this.ctlr.log(err, "error", true)));
    this.config.state.loop = e.value;
    e.resolve(this.name);
  }
  protected handleCurrentTextTrackIntent(e: REvent<CtlrMedia, "intent.currentTextTrack">): void {
    if (e.resolved) return;
    this.when("loadedMetadata", e, () => {
      const track = (this.config.status.textTracks as VimeoTextTrack[])[e.value as number]; // #VALIDATED: mediated for cast conformity; no-opy
      track ? this.host!.enableTextTrack(track.language, track.kind).catch((err) => this.ctlr.log(err, "error", true)) : this.host!.disableTextTrack().catch((err) => this.ctlr.log(err, "error", true));
    });
    e.resolve(this.name);
  }
  protected handleCurrentAudioTrackIntent(e: REvent<CtlrMedia, "intent.currentAudioTrack">): void {
    if (e.resolved) return;
    this.when("loadedMetadata", e, () => {
      const track = (this.config.status.audioTracks as VimeoAudioTrack[])[e.value as number]; // #VALIDATED: mediated for cast conformity; no-opy
      if (track) this.host!.selectAudioTrack(track.language, track.kind).catch((err) => this.ctlr.log(err, "error", true));
    });
    e.resolve(this.name);
  }
  protected handleCurrentLevelIntent(e: REvent<CtlrMedia, "intent.currentLevel">): void {
    if (e.resolved) return;
    this.when("loadedMetadata", e, () => {
      const quality = (this.config.status.levels as VimeoQuality[])[e.value as number]; // #VALIDATED: mediated for cast conformity; no-opy
      if (quality) this.host!.setQuality(quality.id).catch((err) => this.ctlr.log(err, "error", true));
    });
    e.resolve(this.name);
  }
  protected handleAutoLevelIntent(e: REvent<CtlrMedia, "intent.autoLevel">): void {
    if (e.resolved) return;
    this.when("loadedMetadata", e, () => {
      this.host!.setQuality(e.value ? "auto" : (this.config.status.levels as VimeoQuality[])[0]?.id).catch((err) => this.ctlr.log(err, "error", true));
      this.config.state.autoLevel = e.value;
    });
    e.resolve(this.name);
  }
  protected handleLiveIntent(e: REvent<CtlrMedia, "intent.live">): void {
    if (e.resolved) return;
    this.when("loadedMetadata", e, (seekable = this.config.status.seekable) => e.value && seekable.length && (this.media.intent.currentTime = seekable.end(seekable.length - 1) - 1)); // #FACADED: silenced intent actual op
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
    const { state: s, status: st } = this.config;
    // console.log("Vimeo Event:", evt, data);
    switch (evt) {
      case "loaded":
        this.setInitInfo();
        setTimeout(
          () => {
            st.readyState = 1; // HAVE METADATA
            st.waiting = false;
            st.loadedMetadata = true;
          },
          100, // promise abuse effects
          this.signal
        ); // stall due to promises
        break;
      case "playing":
      case "play":
        st.readyState = 4; // HAVE ENOUGH DATA
        st.canPlay = st.canPlayThrough = st.loadedData = true;
        st.ended = st.waiting = s.paused = false;
        if (evt === "playing") st.error = null; // UX boost
        break;
      case "pause":
        s.paused = true;
        this.host!.getPlayed().then((played) => (st.played = createTimeRanges(played)));
        st.waiting = false;
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
        prev === Infinity ? (st.isLive = false) : prev > 0 && st.duration > prev && ++this.durationSeq > 3 && (st.isLive = true); // UX boost
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
        s.currentTime = data.seconds;
        st.seeking = false;
        break;
      case "bufferstart":
        st.waiting = true;
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
        return void (st.activeCue = data.cues[0] || null);
      case "chapterchange":
        this.config.state.currentChapter = data.index - 1;
        break;
      case "qualitychange":
        return void (s.currentLevel = (st.levels as VimeoQuality[]).findIndex((q) => q.id === data.quality));
      case "resize":
        return void ((st.videoWidth = data.videoWidth), (st.videoHeight = data.videoHeight));
      case "enterpictureinpicture":
        return void (s.pictureInPicture = true);
      case "leavepictureinpicture":
        return void (s.pictureInPicture = false);
      case "fullscreenchange":
        return void (s.fullscreen = data.fullscreen);
      case "error":
        return void (data.name === "Error" || data.name === "RangeError" || data.name === "TypeError" || data.method ? this.ctlr.log(`Vimeo error occurred: ${data.message}`, "error", true) : this.handleHostError(data)); // RangeError for out-of-range seeks and TypeError for invalid API calls
    }
  }
  protected handleHostError(err: any): void {
    this.config.status.error = { ...err, code: err?.code ?? 5, message: err?.message || "Vimeo Video Not Found." }; // 5 = MEDIA_ERR_UNKNOWN to allow mssg fallback
    this.config.status.waiting = false;
  }
  // --- Lifecycle ---
  protected async setInitInfo(): Promise<void> {
    if (!this.host) return;
    this.autoChapters = !this.config.settings.metadata.allowOverride; // maybe chapter "cuechange" over to u; base
    // Status (Infos & Lists)
    this.host.getDuration().then((duration) => (this.config.status.isLive = (this.config.status.duration = duration) === Infinity));
    this.host.getPlayed().then((played) => (this.config.status.played = createTimeRanges(played)));
    this.host.getBuffered().then((buffered) => (this.config.status.buffered = createTimeRanges(buffered)));
    this.host.getSeekable().then((seekable) => (this.config.status.seekable = createTimeRanges(seekable)));
    this.host.getChapters().then((chapters, _meta = this.config.settings.metadata) => _meta.allowOverride && (_meta.chapterInfo = inert(chapters)));
    this.host.getTextTracks().then((tracks) => (this.config.status.textTracks = inert(tracks)));
    this.host.getAudioTracks().then((tracks) => (this.config.status.audioTracks = inert(tracks)));
    this.host.getQualities().then((qualities) => (this.config.status.levels = inert(qualities)));
    Promise.all([this.host.getVideoWidth(), this.host.getVideoHeight()]).then(([w, h]) => ((this.config.status.videoWidth = w), (this.config.status.videoHeight = h))); // Fixed the comma-operator bug here
    // States (Sync engine to reality)
    this.host.getPaused().then((paused) => (this.config.state.paused = paused));
    this.host.getCurrentTime().then((time) => (this.config.state.currentTime = time));
    this.host.getVolume().then((vol) => (this.config.state.volume = vol * 100)); // Map 1.0 to 100
    this.host.getMuted().then((muted) => (this.config.state.muted = muted));
    this.host.getPlaybackRate().then((rate) => (this.config.state.playbackRate = rate));
    this.host.getLoop().then((loop) => (this.config.state.loop = loop));
    this.host.getPictureInPicture().then((pip) => (this.config.state.pictureInPicture = pip));
    this.host.getFullscreen().then((fs) => (this.config.state.fullscreen = fs));
  }
  protected destroyHost(): void {
    if (!this.host) return;
    this.host.destroy(), (this.host = null), (this.media.status.hostReady = false);
    this.element = this.hostDiv as HTMLIFrameElement;
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
