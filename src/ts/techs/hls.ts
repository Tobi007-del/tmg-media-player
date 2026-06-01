import { HTML5Tech } from "./html5";
import type { Controller } from "@core/controller";
import type { CtlrMedia, MediaFeatures } from "@defs/contract";
import type { REvent } from "sia-reactor";
import { HLS_EXTENSIONS } from "@utils/matcher";
import { isNum } from "@utils/obj";
import { isSameURL } from "@utils/str";
import { loadResource } from "@utils/dom";
import type { TrackType } from "@utils/media";
import type Hls from "hls.js";

export class HLSTech extends HTML5Tech {
  public static readonly techName = "hls";
  protected hls: Hls | null = null;
  public static override canPlaySource(src: string): boolean {
    return HLS_EXTENSIONS.test(src);
  }
  constructor(ctlr: Controller, features?: MediaFeatures) {
    // prettier-ignore
    super(ctlr, {
      // States & Currents (HLS.js specific)
      autoLevel: true, currentLevel: true, currentAudioTrack: true, 
      // Status & Lists
      bandwidth: true, levels: true, audioTracks: true, ...features
    });
  }
  // --- API Injection ---
  protected async initHls(src: string = "") {
    // Setup & Compatibility
    this.destroyHls();
    const isAudio = this.config.type === "audio",
      HLS = ((window as any).Hls ?? (await loadResource(window.TMG_HLS_JS_SRC!, "script"), (window as any).Hls)) as typeof Hls;
    if (this.signal.aborted) return; // src may have changed during the `await`
    if (!HLS?.isSupported()) return this.ctlr.log("HLS.js is not supported in this browser", "error");
    this.hls = new HLS({ autoStartLoad: true, startPosition: -1, enableWorker: isAudio, defaultAudioCodec: isAudio ? "mp4a.40.2" : undefined }); // tells hls.js to behave if it's an audio-only manifest
    // Status & State (Bulk Wiring)
    this.hls.on(HLS.Events.MEDIA_ATTACHED, () => this.hls?.loadSource(src));
    this.hls.on(HLS.Events.MANIFEST_PARSED, (_, data) => {
      this.config.state.currentTextTrack = this.hls!.subtitleTrack;
      this.config.state.currentAudioTrack = this.hls!.audioTrack;
      this.config.state.currentLevel = this.hls!.currentLevel;
      this.config.state.autoLevel = this.hls!.autoLevelEnabled;
      this.config.status.levels = data.levels;
      this.config.status.textTracks = data.subtitleTracks;
      this.config.status.audioTracks = data.audioTracks;
    });
    this.hls.on(HLS.Events.SUBTITLE_TRACK_SWITCH, (_, data) => (this.config.state.currentTextTrack = data.id));
    this.hls.on(HLS.Events.AUDIO_TRACK_SWITCHED, (_, data) => (this.config.state.currentAudioTrack = data.id));
    this.hls.on(HLS.Events.LEVEL_SWITCHED, (_, data) => (this.config.state.currentLevel = data.level));
    this.hls.on(HLS.Events.FRAG_LOADED, () => this.ctlr.throttle("hlsBandwidth", () => (this.config.status.bandwidth = Math.round((this.hls!.bandwidthEstimate / 1_000_000) * 10) / 10), 2000)); // Converted to Mbps, 1 decimal
    this.hls.on(HLS.Events.ERROR, (_, data) => {
      if (!data.fatal) return;
      switch (data.type) {
        case HLS.ErrorTypes.NETWORK_ERROR:
          return this.hls!.startLoad();
        case HLS.ErrorTypes.MEDIA_ERROR:
          return this.hls!.recoverMediaError();
        default:
          this.config.status.error = { code: 2, message: data.error.message ?? "Fatal HLS error" } as MediaError;
          this.destroyHls();
      }
    });
    this.hls.attachMedia(this.el);
  }
  // ===========================================================================
  // WIRING OVERRIDES
  // ===========================================================================
  protected override wireCurrentTrack(type: TrackType, _type = type.toLowerCase() as Lowercase<TrackType>): void {
    if (type === "Video" || _type === "video") return super.wireCurrentTrack(type); // HLS.js doesn't support video tracks
    this.config.set(`intent.current${type}Track`, (term) => (isNum(term) ? term : this.hls?.[`${_type === "text" ? "subtitle" : _type}Tracks`]?.findIndex((t) => t.id === term || t.name === term || t.lang === term) ?? -1), { signal: this.signal });
    this.config.on(`intent.current${type}Track`, (e) => this.handleCurrentHlsTrackIntent(e, _type), this.evtOpts.CONFIG); // State sync: driven by AUDIO_TRACK_SWITCHED in initHls, not native audioTracks change event
  }
  protected wireCurrentLevel(): void {
    this.config.set("intent.currentLevel", (v) => (isNum(v) ? v : Number(v)), { signal: this.signal }); // #VALIDATOR: rules enforcement
    this.config.on("intent.currentLevel", this.handleCurrentLevelIntent, this.evtOpts.CONFIG);
  }
  protected wireAutoLevel(): void {
    this.config.on("intent.autoLevel", this.handleAutoLevelIntent, this.evtOpts.CONFIG);
  }
  protected override wireActiveCue(): void {
    super.wireActiveCue(false); // HLS.js dynamically injects tracks into the DOM, so the HLS index and DOM index don't match.
  }
  // ===========================================================================
  // HANDLERS
  // ===========================================================================
  protected override handleSrcIntent(e: REvent<CtlrMedia, "intent.src">): void {
    if (e.resolved || isSameURL(this.el.src, e.value)) return;
    if (this.el.canPlayType("application/vnd.apple.mpegurl")) this.destroyHls(), (this.el.src = e.value ?? ""), this.el.load();
    else this.initHls(e.value); // Safari handles HLS natively — can skip hls.js entirely
    e.resolve(HLSTech.techName); // Resolve immediately; initHls runs async in background
  }
  protected handleCurrentLevelIntent(e: REvent<CtlrMedia, "intent.currentLevel">): void {
    if (e.resolved || !this.hls) return void (!this.hls && e.reject("HLS unavailable"));
    this.hls.currentLevel = e.value as number;
    this.config.state.autoLevel = false;
    e.resolve(HLSTech.techName);
  }
  protected handleAutoLevelIntent(e: REvent<CtlrMedia, "intent.autoLevel">): void {
    if (e.resolved || !this.hls) return void (!this.hls && e.reject("HLS unavailable"));
    this.hls.currentLevel = e.value ? -1 : this.hls.currentLevel; // -1 hands control back to hls.js ABR, otherwise pin to whatever is currently playing
    this.config.state.autoLevel = e.value;
    e.resolve(HLSTech.techName);
  }
  protected handleCurrentHlsTrackIntent(e: REvent<CtlrMedia, `intent.current${Exclude<TrackType, "Video">}Track`>, type: Lowercase<Exclude<TrackType, "Video">>): void {
    if (e.resolved || !this.hls) return void (!this.hls && e.reject("HLS unavailable"));
    this.hls[`${type === "text" ? "subtitle" : type}Track`] = e.value as number;
    e.resolve(HLSTech.techName);
  }
  // --- Lifecycle ---
  protected destroyHls(): void {
    this.hls?.destroy(), (this.hls = null);
  }
  protected override onDestroy(): void {
    this.destroyHls(), super.onDestroy();
  }
}

declare module "@defs/registries" {
  interface TechRegistryMap {
    hls: typeof HLSTech;
  }
}
