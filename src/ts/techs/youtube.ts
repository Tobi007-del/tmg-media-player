import { BaseTech } from "./base";
import type { Controller } from "@core/controller";
import type { CtlrMedia, MediaFeatures } from "@defs/contract";
import { inert, type REvent } from "sia-reactor";
import { createEl, enterFullscreen, exitFullscreen, loadResource, queryFullscreenEl, supportsFullscreen } from "@utils/dom";
import { createTimeRanges } from "@utils/time";
import { MATCH_ID_YOUTUBE, MATCH_URL_YOUTUBE } from "@utils/match";
import { isSameURL } from "@utils/str";
import { isFunc, isNum } from "@utils/obj";
import { setTimeout, setInterval } from "@utils/fn";
import { clamp } from "@utils/num";
import { silence } from "sia-reactor/modules";
import { getMediaMax, getMediaMin } from "@utils/time";

export class YouTubeTech extends BaseTech<HTMLIFrameElement> {
  public static readonly techName: string = "youtube";
  public static override canPlaySource(src: string): boolean {
    return MATCH_URL_YOUTUBE.test(src);
  }
  public host: YT.Player | null = null;
  public hostDiv: HTMLDivElement;
  public hostHTML = `<iframe class="tmg-foreign-host tmg-youtube-host" credentialless="true" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share;"></iframe>`;
  protected hostSrc: string | null = null;
  protected intervalId = -1;
  constructor(ctlr: Controller, features?: MediaFeatures) {
    // prettier-ignore
    super(ctlr, {
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
      loadedMetadata: true, loadedData: true, canPlay: true, 
      // Settings
      liveTolerance: true, minDVRWindow: true, ...features
    });
    ctlr.config.mediaPlayer = "YouTube"; // Don't say, I never did nothing for you
    this.element = this.hostDiv = createEl("div", { className: `tmg-host-div ${this.el.className}`, innerHTML: `<div class="tmg-host-content">${this.hostHTML}</div>` }) as HTMLIFrameElement; // for tech.element replaceWith
    ctlr.media.status.hostReady = false;
  }
  // --- API Injection ---
  protected async initHost(url: string, id = "", retries = 0): Promise<void> {
    try {
      const truth = this.config[this.ctlr.techTruth];
      if (!isFunc(this.host?.loadVideoById)) this.destroyHost();
      else return (this.hostSrc = url), (this.reInitInfo = this.config.status.hostReady = true), this.host.loadVideoById(id, truth.currentTime, this.config.status.levels[truth.currentLevel as number] || "default");
      // Setup & Bulk Wiring
      if (!window.YT) await loadResource(window.TMG_YT_API_SRC!, "script"), await new Promise<void>((res, _, _prev = (window as any).onYouTubeIframeAPIReady) => (window.YT?.Player ? res() : ((window as any).onYouTubeIframeAPIReady = () => (_prev?.(), res()))));
      if (!this.signal || this.signal?.aborted) return;
      this.hostSrc = url;
      this.element = this.hostDiv.querySelector("iframe")!;
      this.el.src = `https://www.youtube${truth.crossOrigin === "use-credentials" ? "" : "-nocookie"}.com/embed/${id}?${new URLSearchParams({ autoplay: +(truth.autoplay || !truth.paused), controls: +truth.controls, playsinline: +truth.playsInline, loop: +truth.loop, start: truth.currentTime, rel: +truth.controls, modestbranding: +truth.controls, fs: +truth.controls, iv_load_policy: truth.controls ? 1 : 3, cc_load_policy: "1", disablekb: "1", enablejsapi: "1", origin: window.location.origin } as any).toString()}`;
      this.el.toggleAttribute("data-hide-ui", !truth.controls);
      this.host = new window.YT.Player(this.el, {
        events: {
          onReady: () => {
            if (!isFunc(this.host?.getPlayerState) && retries < this.hostAttempts) return this.ctlr.log(`Retrying host load for "${url}" (${++retries}/${this.hostAttempts})`, "warn"), this.initHost(url, id, retries); // pampering observed quirk where YT API is broken
            this.config.status.hostReady = true;
            this.setInitInfo();
          },
          onStateChange: this.handleHostStateChange,
          onPlaybackQualityChange: (e: { data: string }): void => {
            this.config.status.levels = inert(this.host!.getAvailableQualityLevels().filter((q: string) => q !== "auto"));
            this.config.state.currentLevel = (this.config.status.levels as YT.SuggestedVideoQuality[]).findIndex((q) => q === e.data);
            this.config.state.autoLevel = this.ABRFlag || e.data === "auto";
          },
          onPlaybackRateChange: (e: { data: number }): void => void (this.config.state.playbackRate = e.data),
          onApiChange: () => {
            this.config.status.textTracks = inert((this.host as any).getOption("captions", "tracklist") ?? []); // .map((t: any) => ({ id: `yt-cc-${t.languageCode}`, kind: t.vssId?.startsWith("a.") ? "subtitles" : "captions", label: t.displayName || t.languageName, srclang: t.languageCode, ...t }))
            if (this.config.status.hostReady) silence(() => (this.config.intent.currentTextTrack = this.config.state.currentTextTrack));
            (this.host as any).setOption("captions", "fontSize", this.settings.captions.font.size.value / 100);
          }, // Fired when modules like Captions load
          onError: this.handleHostError,
        },
      });
    } catch (err: any) {
      this.handleHostError(err);
    }
  }
  public hostAttempts = 3;
  // ===========================================================================
  // WIRING (Connections Only)
  // ===========================================================================
  // --- Core Wiring ---
  protected override wireSrc(): void {
    this.config.on("intent.src", this.handleSrcIntent, this.evtOpts.CONFIG);
  }
  protected override wireCurrentTime(): void {
    this.config.get("state.currentTime", (v) => (this.config.status.readyState < 1 || this.config.status.ended ? v : this.host?.getCurrentTime?.()), { signal: this.signal }); // #VIRTUAL: reliable return value, for those faster than the poll
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
    this.config.set("intent.currentTextTrack", (term) => (isNum(term) ? term : (this.config.status.textTracks as any[]).findIndex((t) => t.vssId === term || t.displayName === term || t.languageCode === term)), { signal: this.signal }); // #VALIDATOR: intent type conformation
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
  // --- Core Intents ---
  protected handleSrcIntent(e: REvent<CtlrMedia, "intent.src">): void {
    if (e.resolved || isSameURL(this.hostSrc, e.value)) return;
    const id = e.value.match(MATCH_ID_YOUTUBE)?.[1];
    this.setAutoResPoster(id);
    this.resetLoadInfo(); // Optimistic UI
    this.initHost(e.value, id);
    e.resolve(this.name);
  }
  protected handleCurrentTimeIntent(e: REvent<CtlrMedia, "intent.currentTime">): void {
    if (e.resolved) return;
    this.when("loadedMetadata", e, (min = getMediaMin(this.config), max = getMediaMax(this.config), val = clamp(min, e.value, max), finite = Number.isFinite(val), prev = this.config.state.currentTime) => {
      this.config.status.seeking = true;
      if (e.value < min || e.value > max || !finite) e.reject(this.name); // Out of bounds
      if (!finite) return;
      this.host!.seekTo(val, true), this.config.state.paused && this.host!.pauseVideo(); // pampering observed quirk
      const check = setInterval(() => (!this.config.state.paused || this.config.state.currentTime !== prev) && (clearInterval(check), this.syncCurrentStats(), (this.config.status.seeking = false)), this.config.settings.timeUpdateInterval, this.signal); // YT has no "seeked" event, so we poll for the time shift
    });
    e.resolve(this.name);
  }
  protected handlePausedIntent(e: REvent<CtlrMedia, "intent.paused">): void {
    if (e.resolved) return;
    this.when("loadedMetadata", e, () => (e.value ? this.host!.pauseVideo() : this.host!.playVideo(), this.config.status.ended && setTimeout(() => this.host!.playVideo(), 0, this.signal))); // #PAMPERING: observed quirk
    e.resolve(this.name);
  }
  // --- Feature States ---
  protected setFullscreenChangeState(docInFs?: boolean): void {
    this.config.state.fullscreen = docInFs ? queryFullscreenEl() === this.el : false;
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
    (e.value ? enterFullscreen(this.el) : exitFullscreen(this.el))?.catch(this.ctlr.notice);
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
      e.value === -1 ? (this.host as any).unloadModule("captions") : (this.host as any).loadModule("captions");
      if (e.value === -1) (this.config.state.currentTextTrack = -1), (this.config.state.textVisible = false);
      this.el.toggleAttribute("data-hide-ui", !this.config.state.textVisible);
      const track = this.config.status.textTracks[e.value as number]; // #VALIDATED: mediated for cast conformity; no-opy
      if (track) (this.host as any).setOption("captions", "track", { languageCode: track.srclang }), (this.config.state.currentTextTrack = e.value as number);
    });
    e.resolve(this.name);
  }
  protected handleCurrentLevelIntent(e: REvent<CtlrMedia, "intent.currentLevel">): void {
    if (e.resolved) return;
    this.when("loadedMetadata", e, (quality = (this.config.status.levels as YT.SuggestedVideoQuality[])[e.value as number]) => quality && (this.useAutoLevel(), this.host!.setPlaybackQuality(quality))); // #VALIDATED: mediated for cast conformity; no-opy // #BULLET-PROOF: must comes clutch
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
    this.when("loadedMetadata", e, () => this.useAutoLevel(e.value));
    e.resolve(this.name);
  }
  protected useAutoLevel(value = false): void {
    this.host!.setPlaybackQuality((this.ABRFlag = value) ? "default" : (this.config.status.levels as YT.SuggestedVideoQuality[])[0]);
  }
  private ABRFlag = true;
  protected handleLiveIntent(e: REvent<CtlrMedia, "intent.live">): void {
    if (e.resolved) return;
    this.when("loadedMetadata", e, () => e.value && (this.config.intent.currentTime = this.config.status.duration - 1)); // #FACADED: silenced intent actual op, yt uses a shifting duration
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
    this.reInitInfo && this.setInitInfo();
    const { state: s, status: st, settings: set } = this.config,
      STATE = window.YT.PlayerState;
    // console.log("YouTube Event:", e);
    switch (e.data) {
      case STATE.UNSTARTED:
        silence(() => (this.config.intent.currentTime = clamp(0, this.config.state.currentTime, this.config.status.duration - 1))); // #PAMPERING: observed quirk
        break;
      case STATE.CUED:
        st.duration = this.host!.getDuration();
        st.readyState = 1; // HAVE METADATA
        break;
      case STATE.BUFFERING:
        st.waiting = set.idleWaiting || !s.paused;
        st.readyState = 2; // HAVE CURRENT DATA
        break;
      case STATE.PLAYING:
        st.error = null; // UX boost
        st.ended = st.seeking = st.waiting = s.paused = false;
        st.duration = this.host!.getDuration();
        st.isLive = (this.host!.getVideoData() as any).isLive ?? false; // pampering observed quirk
        st.canPlay = st.loadedData = true;
        st.readyState = 4; // HAVE ENOUGH DATA
        this.syncMetadata(), clearInterval(this.intervalId), (this.intervalId = setInterval(this.syncCurrentStats, set.timeUpdateInterval, this.signal)); // updates 10 times a sec
        break;
      case STATE.PAUSED:
      case STATE.ENDED:
        s.paused = true;
        st.ended = e.data === STATE.ENDED;
        st.seeking = false;
        if (!set.idleWaiting) st.waiting = false;
        clearInterval(this.intervalId), this.syncCurrentStats();
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
  protected syncCurrentStats(): void {
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
  public syncMetadata(data = this.host!.getVideoData()): void {
    if (data && this.config.settings.metadata.allowMediaOverride) data.title && (this.config.settings.metadata.title = data.title), data.author && (this.config.settings.metadata.artist = data.author);
  }
  // --- Lifecycle ---
  protected reInitInfo = false;
  protected setInitInfo(data = this.config.status.hostReady && this.host!.getVideoData(), isShort = this.hostSrc?.includes("/shorts/")): void {
    if (!this.host || !data || (this.reInitInfo = false)) return;
    // Status (Infos & Lists)
    this.config.status.duration = this.host.getDuration();
    this.config.status.isLive = (data as any).isLive || this.config.status.duration === 0; // pampering observed quirk
    (this.config.status.videoWidth = isShort ? 1080 : 1920), (this.config.status.videoHeight = isShort ? 1920 : 1080);
    this.config.status.textTracks = []; // wait for API change
    this.config.status.waiting = false;
    this.config.status.readyState = 1; // HAVE METADATA
    this.config.status.loadedMetadata = true;
    // Settings & Post-Init
    this.syncCurrentStats(), this.syncMetadata(data);
  }
  public setAutoResPoster(id = "", hq = `https://img.youtube.com/vi/${id}/hqdefault.jpg`, maxres = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`): void {
    if (!this.config.settings.metadata.allowMediaOverride) return;
    const seq = ++this.posterSeq,
      img = createEl("img", { src: hq, onload: () => seq === this.posterSeq && (this.config.state.poster = img.naturalWidth <= 120 ? hq : maxres), onerror: () => seq === this.posterSeq && (this.config.state.poster = hq) }); // Preload HQ for immediate use, then conditionally switch to MX if valid
  }
  private posterSeq = 0;
  protected destroyHost(): void {
    if (!this.host) return;
    this.host.destroy(), (this.host = null);
    (this.element = this.hostDiv as HTMLIFrameElement).innerHTML = `<div class="tmg-host-content">${this.hostHTML}</div>`; // Reset to placeholder
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
