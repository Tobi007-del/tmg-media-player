import { HTML5Tech } from "./html5";
import type { Controller } from "@core/controller";
import type { CtlrMedia, MediaFeatures } from "@defs/contract";
import { inert, type REvent } from "sia-reactor";
import { DASH_EXTENSIONS } from "@utils/match";
import { MSE_ENABLED } from "@utils/env";
import { capitalize, isSameURL } from "@utils/str";
import { isNum } from "@utils/obj";
import { loadResource } from "@utils/dom";
import type { TrackType } from "@utils/media";
import type * as dashjs from "dashjs";

interface DashMediaPlayer extends dashjs.MediaPlayerClass {
  getBitrateInfoListFor(type: "video" | "audio"): any[];
  setQualityFor(type: "video" | "audio", value: number): void;
} // dashjs is notorious for stale types; not us

export class DashTech extends HTML5Tech {
  public static readonly techName: string = "dash";
  public host: DashMediaPlayer | null = null;
  public static override canPlaySource(src: string): boolean {
    return MSE_ENABLED && DASH_EXTENSIONS.test(src);
  }
  protected strictTracks: boolean = true;
  protected hostSrc: string | null = null;
  constructor(ctlr: Controller, features?: MediaFeatures) {
    const isVid = ctlr.media.type === "video";
    // prettier-ignore
    super(ctlr, {
      // States & Lists
      sources: false, tracks: false, textTracks: true, audioTracks: true, videoTracks: isVid, levels: true, 
      // States & Currents (DASH.js specific)
      currentAudioTrack: true, currentVideoTrack: isVid, currentLevel: true, autoLevel: true, 
      // Status & Settings
      bandwidth: true, protection: true, srcObject: false, ...features
    });
    ctlr.media.status.hostReady = false;
  }
  // --- API Injection ---
  protected async initHost(src = "") {
    try {
      // Setup & Compatibility
      this.destroyDash();
      const DASHJS = ((window as any).dashjs ?? (await loadResource(window.TMG_DASH_JS_SRC!, "script"), (window as any).dashjs)) as typeof dashjs;
      if (this.signal.aborted) return; // src may have changed during the `await`
      if (!DASHJS?.supportsMediaSource()) return this.ctlr.notice("DASH is not supported in this browser", "error", null);
      const base = this.config[this.ctlr.techTruth];
      this.hostSrc = src;
      this.host = DASHJS.MediaPlayer().create() as DashMediaPlayer;
      if (this.config.type === "audio") this.host.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: false } }, trackSwitchMode: { audio: "alwaysReplace", video: "alwaysReplace" }, buffer: { fastSwitchEnabled: true } } }); // DASH.js to replace the audio to avoid buffer finish delays
      if (this.config.settings.metadata.allowOverride) this.config.settings.metadata.chapterInfo = [];
      // Status & State (Bulk Wiring)
      this.host.on(DASHJS.MediaPlayer.events.STREAM_INITIALIZED, () => {
        this.config.status.isLive = this.host!.isDynamic();
        const autoSwitch = (this.host!.getSettings() as any).streaming?.abr?.autoSwitchBitrate;
        this.config.state.autoLevel = typeof autoSwitch === "boolean" ? autoSwitch : autoSwitch?.video ?? true; // Fallback logic for v3 vs v4+ API shapes
        for (const t of ["text", "audio", "video"] as const) this.config.status[`${t}Tracks`] = inert(this.host!.getTracksFor(t));
        this.config.status.levels = inert(this.host!.getBitrateInfoListFor("video"));
        this.media.status.hostReady = true;
      });
      this.host.on(DASHJS.MediaPlayer.events.TRACK_CHANGE_RENDERED, (ev: any) => {
        const i = this.host?.getTracksFor(ev.mediaType)?.findIndex((t) => t.id === ev.newMediaInfo?.id || t.index === ev.newMediaInfo?.index);
        this.config.state[`current${capitalize<TrackType>(ev.mediaType)}Track`] = i ?? -1;
      });
      this.host.on(DASHJS.MediaPlayer.events.QUALITY_CHANGE_RENDERED, (ev: any) => ev.mediaType === "video" && (this.config.state.currentLevel = ev.newQuality ?? ev.index)); // v4+ uses newQuality, v3 uses index
      this.host.on(DASHJS.MediaPlayer.events.FRAGMENT_LOADING_COMPLETED, (ev) => this.ctlr.throttle("dashBandWidth", () => ev.request?.mediaType === "video" && (this.config.status.bandwidth = Math.round((this.host!.getAverageThroughput("video") / 1000) * 10) / 10), 2000)); // Converted to Mbps, 1 decimal
      this.host.on(DASHJS.MediaPlayer.events.EVENT_MODE_ON_RECEIVE, (ev: any) => {
        if (!this.config.settings.metadata.allowOverride) return;
        if (!ev.schemeIdUri?.includes("chapter") && !ev.schemeIdUri?.includes("title")) return;
        const chapters = this.config.settings.metadata.chapterInfo;
        if (chapters.find((c) => c.startTime === ev.presentationTime)) return;
        chapters.push({ title: new TextDecoder("utf-8").decode(ev.messageData).replace(/\0/g, "").trim(), startTime: ev.presentationTime });
        this.config.settings.metadata.chapterInfo = chapters.sort((a, b) => a.startTime - b.startTime);
      });
      this.host.on(DASHJS.MediaPlayer.events.ERROR, (ev) => {
        if (ev.error === "download") return this.ctlr.notice(`DASH Download error occurred: ${ev.event}`, "error", `Download failed for "${ev.event?.url}"`);
        if (ev.error !== "mediasource") return;
        this.handleHostError(ev);
      });
      this.config.settings.protection && this.host.setProtectionData(this.config.settings.protection);
      this.host.initialize(this.el, src, base.autoplay || !base.paused, base.currentTime);
    } catch (err) {
      this.handleHostError(err);
    }
  }
  // ===========================================================================
  // WIRING OVERRIDES
  // ===========================================================================
  protected override wireCurrentTrack(type: TrackType, _type = type.toLowerCase() as Lowercase<TrackType>): void {
    this.config.set(`intent.current${type}Track`, (term) => (isNum(term) ? term : (this.config.status[`${_type}Tracks`] as dashjs.MediaInfo[]).findIndex((t) => t.id === term || t.lang === term)), { signal: this.signal }); // #VALIDATOR: intent type conformation
    this.config.on(`intent.current${type}Track`, (e) => this.handleCurrentHostTrackIntent(e, _type), this.evtOpts.CONFIG);
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
      this.host!.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: false } } } });
      if ((e.value as number) > -1 && (e.value as number) < this.config.status.levels.length) {
        this.host!.setQualityFor("video", e.value as number); // #VALIDATED: mediated for cast conformity; no-opy
        this.config.state.autoLevel = false;
      }
    });
    e.resolve(this.name);
  }
  protected handleAutoLevelIntent(e: REvent<CtlrMedia, "intent.autoLevel">): void {
    if (e.resolved) return;
    this.when("hostReady", e, () => {
      this.host!.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: e.value } } } });
      this.config.state.autoLevel = e.value as boolean;
    });
    e.resolve(this.name);
  }
  protected handleCurrentHostTrackIntent(e: REvent<CtlrMedia, `intent.current${TrackType}Track`>, type: Lowercase<TrackType>): void {
    if (e.resolved) return;
    this.when("hostReady", e, () => {
      const track = this.config.status[`${type}Tracks`][e.value as number] as dashjs.MediaInfo | undefined; // #VALIDATED: mediated for cast conformity; no-opy
      if (track) this.host!.setCurrentTrack(track);
    });
    e.resolve(this.name);
  }
  protected handleHostError(err: any): void {
    this.config.status.error = { ...err, code: err?.code ?? 5, message: err.error ?? err.message ?? "Fatal DASH error" }; // 5: MEDIA_ERR_UNKNOWN to allow mssg fallback
    this.config.status.waiting = false;
  }
  // --- Lifecycle ---
  protected destroyDash(): void {
    this.host?.reset(), (this.host = null), (this.media.status.hostReady = false);
  }
  protected override onDestroy(): void {
    this.destroyDash(), super.onDestroy();
  }
}

declare module "@defs/registries" {
  interface TechRegistryMap {
    dash: typeof DashTech;
  }
}
