import { BaseTech } from "./base";
import type { Controller } from "@core/controller";
import type { CtlrMedia, MediaFeatures } from "@defs/contract";
import { inert, type REvent } from "sia-reactor";
import { createEl, enterFullscreen, exitFullscreen, loadResource, queryFullscreenEl, supportsFullscreen } from "@utils/dom";
import { createTimeRanges } from "@utils/time";
import { MATCH_URL_YOUTUBE } from "@utils/match";
import { isSameURL } from "@utils/str";
import { isFunc, isNum } from "@utils/obj";
import { setTimeout, setInterval } from "@utils/fn";
import { clamp } from "@utils/num";
import { silence } from "sia-reactor/modules";
import { fanout } from "sia-reactor/utils";
import { getMediaMax, getMediaMin } from "@utils/media";

export class YouTubeTech extends BaseTech<HTMLIFrameElement> {
  public static readonly techName: string = "youtube";
  public host: YT.Player | null = null;
  protected intervalId = -1;
  public static override canPlaySource(src: string): boolean {
    return MATCH_URL_YOUTUBE.test(src);
  }
  public hostDiv: HTMLDivElement;
  protected hostSrc: string | null = null;
  constructor(ctlr: Controller, features?: MediaFeatures) {
    // prettier-ignore
    super(ctlr,{
      // Engine Inputs
      volume: true, muted: true, playbackRate: true,
      // Modes
      fullscreen: supportsFullscreen(),
      // States (YouTube loads these via intent, but we claim support)
      autoplay: true, loop: true, playsInline: true, controls: true, crossOrigin: true, live: false,
      // Lists
      textTracks: true, levels: true, 
      // Currents
      currentTextTrack: true, currentLevel: true, textVisible: true, autoLevel: true,
      // Infos
      readyState: true, error: true, waiting: true, seeking: true, buffered: true, seekable: true,
      loadedMetadata: true, loadedData: true, canPlay: true, canPlayThrough: true, 
      // Settings
      liveTolerance: true, minDVRWindow: true, ...features
    });
    ctlr.config.mediaPlayer = "YouTube"; // Don't say, I never did nothing for you
    this.element = this.hostDiv = createEl("div", { className: `tmg-host-div ${this.el.className}`, innerHTML: `<div class="tmg-host-content"><div></div></div>` }) as HTMLIFrameElement; // "now" to maintain the tech.element contract
    ctlr.media.status.hostReady = false;
  }
  // --- API Injection ---
  protected async initHost(url: string, videoId: string) {
    try {
      const base = this.config[this.ctlr.techTruth];
      if (isFunc(this.host?.loadVideoById)) return (this.hostSrc = url), (this.media.status.hostReady = isFunc(this.host?.getPlayerState)), (this.reInitInfo = true), this.host.loadVideoById(videoId, base.currentTime, this.config.status.levels[base.currentLevel as number] || "default");
      else this.destroyHost();
      // Setup & Bulk Wiring
      if (!window.YT) await loadResource(window.TMG_YT_API_SRC!, "script"), await new Promise<void>((res, _, _prev = (window as any).onYouTubeIframeAPIReady) => (window.YT?.Player ? res() : ((window as any).onYouTubeIframeAPIReady = () => (_prev?.(), res()))));
      if (!this.signal || this.signal?.aborted) return;
      this.hostSrc = url;
      this.host = new window.YT.Player(this.el.firstElementChild!.firstElementChild as HTMLElement, {
        videoId,
        host: base.crossOrigin === "use-credentials" ? undefined : "https://www.youtube-nocookie.com",
        playerVars: {
          autoplay: +(base.autoplay || !base.paused),
          controls: +base.controls,
          playsinline: +base.playsInline,
          loop: +base.loop,
          start: base.currentTime,
          rel: +base.controls,
          modestbranding: +base.controls,
          fs: +base.controls,
          iv_load_policy: base.controls ? 1 : 3,
          cc_load_policy: 1,
          disablekb: 1,
        },
        events: {
          onReady: () => {
            this.media.status.hostReady = isFunc(this.host?.getPlayerState);
            (this.element = this.host!.getIframe()), this.el.classList.add("tmg-foreign-host", "tmg-youtube-host"), this.el.toggleAttribute("data-hide-ui", !base.controls); // YT replaces el
            this.setInitInfo();
          },
          onStateChange: this.handleHostStateChange,
          onPlaybackQualityChange: (e: { data: string }): void => {
            if (!this.config.status.levels.length) this.config.status.levels = inert(this.host!.getAvailableQualityLevels());
            this.config.state.currentLevel = (this.config.status.levels as YT.SuggestedVideoQuality[]).findIndex((q) => q === e.data);
          },
          onPlaybackRateChange: (e: { data: number }): void => void (this.config.state.playbackRate = e.data),
          onApiChange: () => {
            this.config.status.textTracks = ((this.host as any).getOption("captions", "tracklist") ?? []).map((t: any) => ({ id: `yt-cc-${t.languageCode}`, kind: "captions", label: t.languageName || t.displayName, srclang: t.languageCode }));
            if (this.media.status.hostReady) this.config.intent.currentTextTrack = this.config.state.currentTextTrack;
            (this.host as any).setOption("captions", "fontSize", this.settings.captions.font.size.value / 100);
          }, // Fired when modules like Captions load
          onError: this.handleHostError,
        },
      });
    } catch (err: any) {
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
    this.config.get("state.currentTime", (v) => (this.config.status.ended ? this.config.status.duration : this.host?.getCurrentTime?.()) ?? v, { signal: this.signal }); // #VIRTUAL: reliable return value, for those faster than the poll
    this.config.on("intent.currentTime", this.handleCurrentTimeIntent, this.evtOpts.CONFIG);
  }
  protected override wireDuration(): void {} // Polled dynamically in sync loop; YT emits no explicit duration event
  protected override wirePaused(): void {
    this.config.on("intent.paused", this.handlePausedIntent, this.evtOpts.CONFIG);
  }
  protected override wireEnded(): void {} // Handled strictly within handleHostStateChange
  protected override wireFeatures(): void {
    super.wireFeatures();
    // Ctlr Config Listners
    this.ctlr.config.on("settings.captions.font.size.value", ({ value }) => (this.host as any)?.setOption("captions", "fontSize", value / 100), { signal: this.signal });
  }
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
  // --- Attributes Wiring ---
  protected wireLoop(): void {
    this.config.on("intent.loop", this.handleLoopIntent, this.evtOpts.CONFIG);
  }
  // --- Track Switching Wiring ---
  protected wireCurrentTextTrack(): void {
    this.config.set("intent.currentTextTrack", (term) => (isNum(term) ? term : (this.config.status.textTracks as any[]).findIndex((t) => t.srclang === term)), { signal: this.signal }); // #VALIDATOR: intent type conformation
    this.config.on("intent.currentTextTrack", this.handleCurrentTextTrackIntent, this.evtOpts.CONFIG);
  }
  protected wireCurrentLevel(): void {
    this.config.set("intent.currentLevel", (term) => (isNum(term) ? term : Number(term)), { signal: this.signal }); // #VALIDATOR: intent type conformation
    this.config.on("intent.currentLevel", this.handleCurrentLevelIntent, this.evtOpts.CONFIG);
  }
  protected wireTextVisible(): void {
    this.config.on("intent.textVisible", this.handleTextVisibleIntent, this.evtOpts.CONFIG);
    this.config.watch("status.textTracks", this.onTracksStatus, this.evtOpts.CONFIG);
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
    const { state: s, status: st, settings: set } = this.config;
    st.error = st.activeCues = null;
    (st.buffered = createTimeRanges([])), (st.seekable = createTimeRanges([]));
    st.duration = NaN;
    st.waiting = set.idleWaiting || !s.paused;
    st.readyState = s.currentTime = 0; // HAVE NOTHING
    st.ended = st.stalled = st.loadedData = st.loadedMetadata = st.canPlay = st.canPlayThrough = false;
  }
  // --- Core Intents ---
  protected handleSrcIntent(e: REvent<CtlrMedia, "intent.src">): void {
    if (e.resolved || isSameURL(this.hostSrc, e.value)) return;
    const videoId = e.value.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|shorts\/|live\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)?.[1];
    if (!videoId) return;
    this.setLoadStartInfo(); // Optimistic UI
    this.setHighResPoster(videoId);
    this.initHost(e.value, videoId);
    e.resolve(this.name);
  }
  protected handleCurrentTimeIntent(e: REvent<CtlrMedia, "intent.currentTime">): void {
    if (e.resolved) return;
    this.when("loadedMetadata", e, (min = getMediaMin(this.config), max = getMediaMax(this.config)) => {
      this.config.status.seeking = true;
      const prev = this.media.state.currentTime;
      if (e.value < min! || e.value > max!) e.reject(this.name); // Out of bounds
      this.host!.seekTo(clamp(min, e.value, max), true), this.media.state.paused && this.host!.pauseVideo(); // pampering obseerved quirk
      const check = setInterval(() => (!this.config.state.paused || this.host!.getCurrentTime() !== prev) && (clearInterval(check), this.syncCurrentTime(), (this.config.status.seeking = false)), 100, this.signal); // YT has no "seeked" event, so we poll for the time shift
    });
    e.resolve(this.name);
  }
  protected handlePausedIntent(e: REvent<CtlrMedia, "intent.paused">): void {
    if (e.resolved) return;
    this.when("loadedMetadata", e, () => (e.value ? this.host!.pauseVideo() : this.host!.playVideo(), this.media.status.ended && setTimeout(() => this.host!.playVideo(), 0, this.signal))); // #PAMPERING: observed quirk where playVideo after ended doesn't reset to 0, but a delayed one does
    e.resolve(this.name);
  }
  // --- Feature States ---
  protected setFullscreenChangeState(docInFs?: boolean): void {
    this.config.state.fullscreen = docInFs ? queryFullscreenEl() === this.element : false;
  }
  // --- Feature Intents ---
  protected handleVolumeIntent(e: REvent<CtlrMedia, "intent.volume">): void {
    if (e.resolved) return;
    if (e.value < 0 || e.value > 100) e.reject(this.name); // Out of bounds
    this.when("hostReady", e, () => {
      this.host!.setVolume(clamp(0, e.value, 100));
      this.config.state.volume = clamp(0, e.value, 100);
    });
    e.resolve(this.name);
  }
  protected handleMutedIntent(e: REvent<CtlrMedia, "intent.muted">): void {
    if (e.resolved) return;
    this.when("hostReady", e, () => {
      e.value ? this.host!.mute() : this.host!.unMute();
      this.config.state.muted = e.value;
    });
    e.resolve(this.name);
  }
  protected handlePlaybackRateIntent(e: REvent<CtlrMedia, "intent.playbackRate">): void {
    if (e.resolved) return;
    if (e.value < 0.25 || e.value > 2) e.reject(this.name); // Out of bounds
    this.when("hostReady", e, () => {
      this.host!.setPlaybackRate(clamp(0.25, e.value, 2));
      this.config.state.playbackRate = clamp(0.25, e.value, 2);
    });
    e.resolve(this.name);
  }
  protected handleFullscreenIntent(e: REvent<CtlrMedia, "intent.fullscreen">): void {
    if (e.resolved) return;
    (e.value ? enterFullscreen(this.element) : exitFullscreen(this.element))?.catch(this.ctlr.notice);
    e.resolve(this.name);
  }
  protected handleLoopIntent(e: REvent<CtlrMedia, "intent.loop">): void {
    if (e.resolved) return;
    this.when("hostReady", e, () => {
      this.host!.setLoop(e.value);
      this.config.state.loop = e.value;
    });
    e.resolve(this.name);
  }
  protected handleCurrentTextTrackIntent(e: REvent<CtlrMedia, "intent.currentTextTrack">): void {
    if (e.resolved) return;
    this.when("loadedMetadata", e, () => {
      if (e.value === -1) (this.host as any).unloadModule("captions"), this.el.setAttribute("data-hide-ui", ""), (this.config.state.currentTextTrack = -1);
      else {
        (this.host as any).loadModule("captions"), this.el.toggleAttribute("data-hide-ui", !this.config.state.textVisible);
        const track = this.config.status.textTracks[e.value as number]; // #VALIDATED: mediated for cast conformity; no-opy
        if (track) (this.host as any).setOption("captions", "track", { languageCode: track.srclang }), (this.config.state.currentTextTrack = e.value as number);
      }
    });
    e.resolve(this.name);
  }
  protected handleCurrentLevelIntent(e: REvent<CtlrMedia, "intent.currentLevel">): void {
    if (e.resolved) return;
    this.when("loadedMetadata", e, () => {
      const quality = (this.config.status.levels as YT.SuggestedVideoQuality[])[e.value as number]; // #VALIDATED: mediated for cast conformity; no-opy
      if (quality) {
        this.host!.setPlaybackQuality(quality);
        this.config.state.autoLevel = false;
      }
    });
    e.resolve(this.name);
  }
  protected handleTextVisibleIntent(e: REvent<CtlrMedia, "intent.textVisible">): void {
    if (e.resolved) return;
    this.when("loadedMetadata", e, (should = (this.host as any).getOptions().includes("captions") && e.value) => {
      this.el.toggleAttribute("data-hide-ui", !should);
      this.config.state.textVisible = should;
    });
    e.resolve(this.name);
  }
  protected handleAutoLevelIntent(e: REvent<CtlrMedia, "intent.autoLevel">): void {
    if (e.resolved) return;
    this.when("loadedMetadata", e, () => {
      this.host!.setPlaybackQuality(e.value ? "default" : (this.config.status.levels as YT.SuggestedVideoQuality[])[0]);
      this.config.state.autoLevel = e.value;
    });
    e.resolve(this.name);
  }
  protected handleLiveIntent(e: REvent<CtlrMedia, "intent.live">): void {
    if (e.resolved) return;
    this.when("loadedMetadata", e, () => e.value && (this.media.intent.currentTime = this.config.status.duration - 1)); // #FACADED: silenced intent actual op, yt uses a shifting duration
    e.resolve(this.name);
  }
  // --- Dog Feeders ---
  protected onIsLiveStatus(v: boolean): void {
    this.config.features.live = v;
  }
  protected onTracksStatus(v: ArrayLike<any>): void {
    this.config.features.textVisible = v.length > 0;
  }
  // --- API Logic ---
  protected handleHostStateChange(e: { data: number }): void {
    const { state: s, status: st, settings: set } = this.config,
      STATE = window.YT.PlayerState;
    // console.log("YouTube Event:", e);
    switch (e.data) {
      case STATE.UNSTARTED:
        this.reInitInfo && this.setInitInfo(), silence(() => (this.media.intent.currentTime = clamp(0, this.media.state.currentTime, this.media.status.duration - 1))); // #PAMPERING: observed quirk
        break;
      case STATE.CUED:
        st.duration = this.host!.getDuration();
        st.readyState = 1; // HAVE METADATA
        break;
      case STATE.BUFFERING:
        this.reInitInfo && this.setInitInfo();
        st.waiting = set.idleWaiting || !s.paused;
        st.readyState = 2; // HAVE CURRENT DATA
        break;
      case STATE.PLAYING:
        st.error = null; // UX boost
        st.ended = st.seeking = st.waiting = s.paused = false;
        st.canPlay = st.canPlayThrough = true;
        st.duration = this.host!.getDuration();
        st.isLive = (this.host!.getVideoData() as any).isLive ?? false; // pampering obseerved quirk
        st.readyState = 4; // HAVE ENOUGH DATA
        st.loadedData = true;
        this.syncMetadata(), clearInterval(this.intervalId), (this.intervalId = setInterval(this.syncCurrentTime, 100, this.signal)); // updates 10 times a sec
        break;
      case STATE.PAUSED:
      case STATE.ENDED:
        s.paused = true;
        st.ended = e.data === STATE.ENDED;
        st.seeking = false;
        if (!set.idleWaiting) st.waiting = false;
        clearInterval(this.intervalId), this.syncCurrentTime();
        break;
    }
  }
  protected handleHostError(err: { data?: number; message?: string }): void {
    if (!this.signal || this.signal?.aborted) return;
    let msg = "Unknown YouTube Error";
    if (err.data === 2 || err.data === 100) msg = "YouTube Video Not Found";
    else if (err.data === 101 || err.data === 150) msg = "Playback disabled by owner";
    else if (err.data === 5) msg = "HTML5 Player Error";
    this.config.status.error = { ...err, code: err.data, message: err.message || msg };
    this.config.status.waiting = false;
  }
  protected syncCurrentTime(): void {
    if (!this.host) return;
    const { status: st, settings: set, state: s } = this.config;
    s.currentTime = st.ended ? st.duration : this.host!.getCurrentTime(); // they can be lazy
    st.buffered = createTimeRanges([[0, this.host!.getVideoLoadedFraction() * st.duration]]);
    st.seekable = createTimeRanges([[st.isLive ? Math.max(0, st.duration - 43200) : 0, st.duration]]); // yt has a 12-Hour max DVR
    if (st.isLive) {
      st.canSeekLive = true;
      st.duration = this.host!.getDuration() - 3600; // yt has a 1-Hour latency approx.
      s.live = st.duration - s.currentTime <= set.liveTolerance;
    } else st.ended = s.currentTime === st.duration; // UX boost
  }
  protected syncMetadata(data = this.host!.getVideoData() as any): void {
    data && this.config.settings.metadata.allowMediaOverride && fanout(this.media.settings.metadata, { id: data.video_id, title: data.title, artist: data.author || undefined }, { skipUndefined: true, txLabel: "YouTube Metadata Override" });
  }
  // --- Lifecycle ---
  protected reInitInfo = false;
  protected setInitInfo(data = this.media.status.hostReady && this.host!.getVideoData(), isShort = this.hostSrc?.includes("/shorts/")): void {
    if (!this.host || !data) return;
    // Status (Infos & Lists)
    this.config.status.readyState = 1; // HAVE METADATA
    this.config.status.duration = this.host.getDuration();
    this.config.status.isLive = (data as any).isLive || this.config.status.duration === 0; // pampering obseerved quirk
    (this.config.status.videoWidth = isShort ? 1080 : 1920), (this.config.status.videoHeight = isShort ? 1920 : 1080);
    this.config.status.textTracks = []; // wait for API change
    this.config.status.waiting = false;
    this.config.status.loadedMetadata = true;
    // Settings & Post-Init
    this.syncCurrentTime(), this.syncMetadata(data), (this.reInitInfo = false);
  }
  protected setHighResPoster(videoId: string): void {
    if (!this.config.settings.metadata.allowMediaOverride) return;
    const hq = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      img = createEl("img", { src: hq, onload: () => (this.config.intent.poster = img.naturalWidth <= 120 ? hq : `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`), onerror: () => (this.config.intent.poster = hq) }); // Preload HQ for immediate use, then conditionally switch to MX if valid
  }
  protected destroyHost(): void {
    if (!this.host) return;
    clearInterval(this.intervalId);
    this.host.destroy(), (this.host = null), (this.media.status.hostReady = false);
    (this.element = this.hostDiv as HTMLIFrameElement), (this.hostDiv.innerHTML = `<div class="tmg-host-content"><div></div></div>`); // Reset to placeholder
  }
  protected override onDestroy(): void {
    this.destroyHost(), super.onDestroy();
  }
}

declare module "@defs/registries" {
  interface TechRegistryMap {
    youtube: typeof YouTubeTech;
  }
}
