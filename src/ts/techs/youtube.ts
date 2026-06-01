import { BaseTech } from "./base";
import type { Controller } from "@core/controller";
import type { CtlrMedia, MediaFeatures } from "@defs/contract";
import { type REvent } from "sia-reactor";
import { createEl, enterFullscreen, exitFullscreen, loadResource, queryFullscreenEl, supportsFullscreen } from "@utils/dom";
import { createTimeRanges } from "@utils/time";
import { MATCH_URL_YOUTUBE } from "@utils/matcher";
import { isSameURL } from "@utils/str";
import { setInterval } from "@utils/fn";

export class YouTubeTech extends BaseTech<HTMLElement> {
  public static readonly techName = "youtube";
  protected yt: YT.Player | null = null;
  protected ytReady = false;
  public static override canPlaySource(src: string): boolean {
    return MATCH_URL_YOUTUBE.test(src);
  }
  constructor(ctlr: Controller, features?: MediaFeatures) {
    // prettier-ignore
    super(ctlr,{
      // Engine Inputs
      volume: true, muted: true, playbackRate: true,
      // Modes
      fullscreen: supportsFullscreen(),
      // Attributes (YouTube loads these via intent, but we claim support)
      poster: true, autoplay: true, loop: true, playsInline: true, controls: true, crossOrigin: true,
      // Infos
      readyState: true, error: true, waiting: true, seeking: true, buffered: true, seekable: true,
      loadedMetadata: true, loadedData: true, canPlay: true, canPlayThrough: true, ...features
    });
    ctlr.config.mediaPlayer = "YouTube"; // Don't say, I never did nothing for you
    this.element = createEl("div", { className: `youtube-placeholder ${this.el.className}` });
  }
  // --- API Injection ---
  protected async initYT(videoId: string) {
    if (this.yt) return this.yt.loadVideoById(videoId);
    if (!window.YT) {
      await loadResource(window.TMG_YT_API_SRC!, "script");
      await new Promise<void>((res, _, prev = (window as any).onYouTubeIframeAPIReady) => (window.YT?.Player ? res() : ((window as any).onYouTubeIframeAPIReady = () => (prev?.(), res()))));
    }
    if (this.signal.aborted) return;
    return new Promise<void>((resolve) => {
      this.yt = new window.YT.Player(this.el, {
        videoId,
        host: this.config.intent.crossOrigin === "use-credentials" ? undefined : "https://www.youtube-nocookie.com",
        playerVars: { autoplay: +this.config.intent.autoplay, controls: +this.config.intent.controls, playsinline: +this.config.intent.playsInline, loop: +this.config.intent.loop, rel: 0, modestbranding: 1, disablekb: 1, fs: 0, iv_load_policy: 3, cc_load_policy: 0 },
        events: {
          onReady: () => {
            this.ytReady = true;
            (this.element = this.yt!.getIframe()), this.el.classList.add(...this.config.element.classList); // YT replaces
            this.config.state.volume = this.yt!.getVolume();
            this.config.state.muted = this.yt!.isMuted();
            this.config.state.playbackRate = this.yt!.getPlaybackRate();
            this.config.status.duration = this.yt!.getDuration();
            resolve();
          },
          onStateChange: (e: { data: number }) => this.handleYTStateChange(e),
          onError: (e: { data: number }) => this.handleYTError(e),
        },
      });
    });
  }
  // ===========================================================================
  // WIRING (Connections Only)
  // ===========================================================================
  // --- Core Wiring ---
  protected override wireSrc(): void {
    this.config.on("intent.src", this.handleSrcIntent, this.evtOpts.CONFIG);
  }
  protected override wireCurrentTime(): void {
    this.config.get("state.currentTime", (v) => this.yt?.getCurrentTime() ?? v, { signal: this.signal }); // #VIRTUAL: reliable return value
    this.config.on("intent.currentTime", this.handleCurrentTimeIntent, this.evtOpts.CONFIG);
  }
  protected override wireDuration(): void {} // Polled dynamically in sync loop; YT emits no explicit duration event
  protected override wirePaused(): void {
    this.config.on("intent.paused", this.handlePausedIntent, this.evtOpts.CONFIG);
  }
  protected override wireEnded(): void {} // Handled strictly within handleYTStateChange
  // --- Engine Inputs Wiring ---
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
    this.ctlr.state.watch("docInFullscreen", this.setFullscreenChangeState, this.evtOpts.CONFIG);
    this.config.on("intent.fullscreen", this.handleFullscreenIntent, this.evtOpts.CONFIG);
  }
  // --- Attribute Wiring ---
  protected wireLoop(): void {
    this.config.on("intent.loop", this.handleLoopIntent, this.evtOpts.CONFIG);
  }
  // ===========================================================================
  // HANDLERS (The Logic - Auto-Guarded by Controllable)
  // ===========================================================================
  // --- Core Intents ---
  protected handleSrcIntent(e: REvent<CtlrMedia, "intent.src">): void {
    if (e.resolved || isSameURL(this.config.state.src, e.value)) return;
    const videoId = (e.value ?? "").match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)?.[1];
    if (!videoId) return;
    this.setLoadStartInfo(); // Optimistic UI
    this.syncHighResPoster(videoId);
    this.initYT(videoId);
    this.config.state.src = e.value ?? "";
    e.resolve(YouTubeTech.techName);
  }
  protected handleCurrentTimeIntent = (e: REvent<CtlrMedia, "intent.currentTime">): void => {
    if (e.resolved || !this.ytReady) return void (!this.ytReady && e.reject("YT unavailable"));
    this.config.status.seeking = true;
    const time = this.yt!.getCurrentTime();
    this.yt!.seekTo(e.value, true);
    const check = setInterval(() => (!this.config.state.paused || this.yt!.getCurrentTime() !== time) && (clearInterval(check), (this.config.status.seeking = false)), 100, this.signal); // YT has no "seeked" event, so we poll for the time shift
    e.resolve(YouTubeTech.techName);
  };
  protected handlePausedIntent(e: REvent<CtlrMedia, "intent.paused">): void {
    if (e.resolved || !this.ytReady) return void (!this.ytReady && e.reject("YT unavailable"));
    e.value ? this.yt!.pauseVideo() : this.yt!.playVideo();
    e.resolve(YouTubeTech.techName);
  }
  // --- Core States ---
  protected setLoadStartInfo(): void {
    const { state: s, status: st } = this.config;
    st.readyState = 0; // HAVE NOTHING
    st.error = st.activeCue = null;
    st.waiting = true;
    st.ended = st.stalled = st.loadedData = st.loadedMetadata = st.canPlay = st.canPlayThrough = false;
    st.buffered = createTimeRanges([]);
    st.seekable = createTimeRanges([]);
    st.duration = NaN;
    s.paused = true;
  }
  // --- Feature States ---
  protected setFullscreenChangeState(docInFs?: boolean): void {
    this.config.state.fullscreen = docInFs ? queryFullscreenEl() === this.element : false;
  }
  // --- Feature Intents ---
  protected handleVolumeIntent(e: REvent<CtlrMedia, "intent.volume">): void {
    if (e.resolved || !this.ytReady) return void (!this.ytReady && e.reject("YT unavailable"));
    this.yt!.setVolume(e.value);
    this.config.state.volume = e.value;
    e.resolve(YouTubeTech.techName);
  }
  protected handleMutedIntent(e: REvent<CtlrMedia, "intent.muted">): void {
    if (e.resolved || !this.ytReady) return void (!this.ytReady && e.reject("YT unavailable"));
    e.value ? this.yt!.mute() : this.yt!.unMute();
    this.config.state.muted = e.value;
    e.resolve(YouTubeTech.techName);
  }
  protected handlePlaybackRateIntent(e: REvent<CtlrMedia, "intent.playbackRate">): void {
    if (e.resolved || !this.ytReady) return void (!this.ytReady && e.reject("YT unavailable"));
    this.yt!.setPlaybackRate(e.value);
    this.config.state.playbackRate = e.value;
    e.resolve(YouTubeTech.techName);
  }
  protected handleFullscreenIntent(e: REvent<CtlrMedia, "intent.fullscreen">): void {
    if (e.resolved) return;
    (e.value ? enterFullscreen(this.element) : exitFullscreen(this.element))?.catch((err) => this.ctlr.log(err, "error"));
    e.resolve(YouTubeTech.techName);
  }
  protected handleLoopIntent(e: REvent<CtlrMedia, "intent.loop">): void {
    if (e.resolved || !this.ytReady) return void (!this.ytReady && e.reject("YT unavailable"));
    this.yt!.setLoop(e.value);
    this.config.state.loop = e.value;
    e.resolve(YouTubeTech.techName);
  }
  // --- API Logic ---
  protected handleYTStateChange(e: { data: number }): void {
    const { state: s, status: st } = this.config,
      YT_STATE = window.YT.PlayerState;
    switch (e.data) {
      case YT_STATE.UNSTARTED:
        this.setLoadStartInfo();
        break;
      case YT_STATE.CUED:
        st.readyState = 1; // HAVE METADATA
        st.duration = this.yt!.getDuration();
        st.seekable = createTimeRanges([[0, st.duration]]);
        break;
      case YT_STATE.BUFFERING:
        st.readyState = 2; // HAVE CURRENT DATA
        st.waiting = true;
        break;
      case YT_STATE.PLAYING:
        st.readyState = 4; // HAVE ENOUGH DATA
        s.paused = st.ended = st.seeking = false;
        st.canPlay = st.loadedMetadata = st.canPlayThrough = true;
        st.duration = this.yt!.getDuration();
        st.seekable = createTimeRanges([[0, st.duration]]);
        this.ctlr.RAFLoop("ytCurrentTimeUpdating", this.syncCurrentTime);
        break;
      case YT_STATE.PAUSED:
      case YT_STATE.ENDED:
        s.paused = true;
        st.ended = e.data === 0;
        st.seeking = st.waiting = false;
        this.ctlr.cancelRAFLoop("ytCurrentTimeUpdating");
        this.syncCurrentTime();
        break;
    }
  }
  protected handleYTError(e: { data: number }): void {
    let msg = "Unknown YouTube Error";
    if (e.data === 2 || e.data === 100) msg = "Video Not Found";
    else if (e.data === 101 || e.data === 150) msg = "Playback disabled by owner";
    else if (e.data === 5) msg = "HTML5 Player Error";
    this.config.status.error = { code: e.data, message: msg } as MediaError;
    this.config.status.waiting = false;
  }
  protected syncCurrentTime(): void {
    if (!this.ytReady) return;
    this.config.state.currentTime = this.yt!.getCurrentTime();
    this.config.status.buffered = createTimeRanges([[0, this.yt!.getVideoLoadedFraction() * this.config.status.duration]]);
  }
  protected syncHighResPoster(videoId: string): void {
    const hq = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      img = createEl("img", { src: hq, onload: () => (this.config.state.poster = img.naturalWidth <= 120 ? hq : `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`), onerror: () => (this.config.state.poster = hq) }); // Preload HQ for immediate use, then conditionally switch to MX if valid
  }
  // --- Lifecycle ---
  protected destroyYT(): void {
    this.ctlr.cancelRAFLoop("ytCurrentTimeUpdating");
    if (this.yt) this.yt.destroy(), (this.yt = null);
  }
  protected override onDestroy(): void {
    this.destroyYT(), super.onDestroy();
  }
}

declare module "@defs/registries" {
  interface TechRegistryMap {
    youtube: typeof YouTubeTech;
  }
}
