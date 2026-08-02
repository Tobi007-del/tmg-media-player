import { HTML5Tech } from "./html5";
import type { Controller } from "@core/controller";
import type { CtlrMedia, MediaFeatures } from "@defs/contract";
import { inert, type REvent } from "sia-reactor";
import { HLS_EXTENSIONS } from "@utils/match";
import { MSE_ENABLED } from "@utils/env";
import { isNum } from "@utils/obj";
import { isSameURL } from "@utils/str";
import { loadResource } from "@utils/dom";
import type { TrackType } from "@utils/media";
import type Hls from "hls.js";
import type { MediaPlaylist } from "hls.js";

export class HLSTech extends HTML5Tech {
  public static readonly techName: string = "hls";
  public host: Hls | null = null;
  public static override canPlaySource(src: string): boolean {
    return MSE_ENABLED && HLS_EXTENSIONS.test(src);
  }
  protected hostSrc: string | null = null;
  protected readonly isAlien: boolean = true;
  constructor(ctlr: Controller, features?: MediaFeatures) {
    // prettier-ignore
    super(ctlr, {
      // Lists & States
      sources: false, tracks: false, audioTracks: true, levels: true,
      // States & Currents (HLS.js specific)
      currentAudioTrack: true, currentLevel: true, autoLevel: true,
      // Status & Settings
      bandwidth: true, srcObject: false, ...features
    });
    ctlr.media.status.hostReady = false;
  }
  // --- API Injection ---
  protected async initHost(src = "") {
    try {
      // Setup & Compatibility
      this.destroyHls();
      const isAudio = this.config.type === "audio",
        HLS = ((window as any).Hls ?? (await loadResource(window.TMG_HLS_JS_SRC!, "script"), (window as any).Hls)) as typeof Hls;
      if (!this.signal || this.signal?.aborted) return; // src may have changed during the `await`
      if (!HLS?.isSupported()) return this.ctlr.notice("HLS is not supported in this browser", "error", null);
      this.hostSrc = src;
      this.host = new HLS({ autoStartLoad: true, startPosition: this.config[this.ctlr.techTruth].currentTime, enableWorker: isAudio, defaultAudioCodec: isAudio ? "mp4a.40.2" : undefined }); // tells hls.js to behave if it's an audio-only manifest
      if (this.config.settings.metadata.allowMediaOverride) this.config.settings.metadata.chapterInfo = [];
      // Status & State (Bulk Wiring)
      this.host.on(HLS.Events.MEDIA_ATTACHED, () => this.host!.loadSource(src));
      this.host.on(HLS.Events.MANIFEST_PARSED, (_, data) => {
        this.config.state.currentTextTrack = this.host!.subtitleTrack;
        this.config.state.currentAudioTrack = this.host!.audioTrack;
        this.config.state.currentLevel = this.host!.currentLevel;
        this.config.state.autoLevel = this.host!.autoLevelEnabled;
        this.config.status.textTracks = inert(data.subtitleTracks);
        this.config.status.audioTracks = inert(data.audioTracks);
        this.config.status.levels = inert(data.levels);
        this.media.status.hostReady = true;
      });
      this.host.on(HLS.Events.SUBTITLE_TRACK_SWITCH, (_, data) => (this.config.state.currentTextTrack = data.id));
      this.host.on(HLS.Events.AUDIO_TRACK_SWITCHED, (_, data) => (this.config.state.currentAudioTrack = data.id));
      this.host.on(HLS.Events.LEVEL_SWITCHED, (_, data) => (this.config.state.currentLevel = data.level));
      this.host.on(HLS.Events.LEVEL_LOADED, (_, data) => (this.config.status.isLive = data.details.live));
      this.host.on(HLS.Events.FRAG_PARSING_METADATA, (_, data) => {
        if (!this.config.settings.metadata.allowMediaOverride) return;
        const chapters = this.config.settings.metadata.chapterInfo;
        let updated = false;
        for (const s of data.samples) if ((s as any).type === "TIT2" || (s as any).info === "TIT2" || (s as any).key === "T1T2") if (!chapters.find((c) => c.startTime === s.pts)) chapters.push({ title: new TextDecoder("utf-8").decode(s.data).replace(/\0/g, "").trim(), startTime: s.pts }), (updated = true); // supports minor versions
        if (updated) this.config.settings.metadata.chapterInfo = chapters.sort((a: any, b: any) => a.startTime - b.startTime);
      });
      this.host.on(HLS.Events.FRAG_LOADED, () => this.ctlr.throttle("hlsBandwidthing", () => (this.config.status.bandwidth = Math.round(this.host!.bandwidthEstimate)), 2000));
      this.host.on(HLS.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        switch (data.type) {
          case HLS.ErrorTypes.NETWORK_ERROR:
            return this.host!.startLoad();
          case HLS.ErrorTypes.MEDIA_ERROR:
            return this.host!.recoverMediaError();
          default:
            this.handleHostError(data);
        }
      });
      this.host.attachMedia(this.el);
    } catch (err) {
      this.handleHostError(err);
    }
  }
  // ===========================================================================
  // WIRING OVERRIDES
  // ===========================================================================
  protected override wireMediaTracks(): void {}
  protected override wireCurrentTrack(type: TrackType, _type = type.toLowerCase() as Lowercase<TrackType>): void {
    if (type === "Video" || _type === "video") return super.wireCurrentTrack(type); // HLS.js doesn't support video tracks
    this.config.set(`intent.current${type}Track`, (term) => (isNum(term) ? term : (this.config.status[`${_type}Tracks`] as MediaPlaylist[]).findIndex((t) => t.id === term || t.name === term || t.lang === term)), { signal: this.signal }); // #VALIDATOR: intent type conformation
    this.config.on(`intent.current${type}Track`, (e) => this.handleCurrentHostTrackIntent(e, _type), this.evtOpts.CONFIG); // State sync: driven by AUDIO_TRACK_SWITCHED in initHost, not native audioTracks change event
  }
  protected wireCurrentLevel(): void {
    this.config.set("intent.currentLevel", (term) => (isNum(term) ? term : Number(term)), { signal: this.signal }); // #VALIDATOR: intent type conformation
    this.config.on("intent.currentLevel", this.handleCurrentLevelIntent, this.evtOpts.CONFIG);
  }
  protected wireAutoLevel(): void {
    this.config.on("intent.autoLevel", this.handleAutoLevelIntent, this.evtOpts.CONFIG);
  }
  // ===========================================================================
  // HANDLERS
  // ===========================================================================
  protected override handleSrcIntent(e: REvent<CtlrMedia, "intent.src">): void {
    if (e.resolved || isSameURL(this.hostSrc, e.value)) return;
    this.initHost(e.value);
    e.resolve(this.name);
  }
  protected handleCurrentLevelIntent(e: REvent<CtlrMedia, "intent.currentLevel">): void {
    if (e.resolved) return;
    this.when("hostReady", e, () => {
      if ((e.value as number) < this.config.status.levels.length) {
        this.host!.currentLevel = e.value as number; // #VALIDATED: mediated for cast conformity; no-opy
        this.config.state.autoLevel = false;
      }
    });
    e.resolve(this.name);
  }
  protected handleAutoLevelIntent(e: REvent<CtlrMedia, "intent.autoLevel">): void {
    if (e.resolved) return;
    this.when("hostReady", e, () => {
      this.host!.currentLevel = e.value ? -1 : this.host!.currentLevel; // -1 hands control back to hls.js ABR, otherwise pin to whatever is currently playing
      this.config.state.autoLevel = e.value;
    });
    e.resolve(this.name);
  }
  protected handleCurrentHostTrackIntent(e: REvent<CtlrMedia, `intent.current${Exclude<TrackType, "Video">}Track`>, type: Lowercase<Exclude<TrackType, "Video">>): void {
    if (e.resolved) return;
    this.when("hostReady", e, () => {
      if ((e.value as number) < this.config.status[`${type}Tracks`].length) this.host![`${type === "text" ? "subtitle" : type}Track`] = e.value as number; // #VALIDATED: mediated for cast conformity; no-opy
    });
    e.resolve(this.name);
  }
  protected override handleLiveIntent(e: REvent<CtlrMedia, "intent.live">): void {
    if (e.resolved) return;
    this.when("hostReady", e, () => e.value && (this.host!.liveSyncPosition ? (this.media.intent.currentTime = this.host!.liveSyncPosition) : super.handleLiveIntent(e))); // #FACADED: silenced intent actual op
    e.resolve(this.name);
  }
  protected handleHostError(err: any): void {
    if (!this.signal || this.signal?.aborted) return;
    this.config.status.error = { ...err, code: err?.code ?? 5, message: err.message ?? "Fatal HLS error" }; // 5: MEDIA_ERR_UNKNOWN to allow mssg fallback
    this.config.status.waiting = false;
  }
  // --- Lifecycle ---
  protected destroyHls(): void {
    this.host?.destroy(), (this.host = null), (this.media.status.hostReady = false);
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
