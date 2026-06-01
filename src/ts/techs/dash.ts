import { HTML5Tech } from "./html5";
import type { Controller } from "@core/controller";
import type { CtlrMedia, MediaFeatures } from "@defs/contract";
import type { REvent } from "sia-reactor";
import { DASH_EXTENSIONS } from "@utils/matcher";
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
  public static readonly techName = "dash";
  protected dash: DashMediaPlayer | null = null;
  public static override canPlaySource(src: string): boolean {
    return DASH_EXTENSIONS.test(src);
  }
  constructor(ctlr: Controller, features?: MediaFeatures) {
    const isVid = ctlr.media.type === "video";
    // prettier-ignore
    super(ctlr, {
      // States & Currents (DASH.js specific)
      autoLevel: true, currentLevel: true, currentAudioTrack: true, currentVideoTrack: isVid,
      // Status & Lists & Settings
      bandwidth: true, levels: true, audioTracks: true, textTracks: true, videoTracks: isVid, protection: true, ...features
    });
  }
  // --- API Injection ---
  protected async initDash(src: string = "") {
    // Setup & Compatibility
    this.destroyDash();
    const DASHJS = ((window as any).dashjs ?? (await loadResource(window.TMG_DASH_JS_SRC!, "script"), (window as any).dashjs)) as typeof dashjs;
    if (this.signal.aborted) return; // src may have changed during the `await`
    if (!DASHJS?.supportsMediaSource()) return this.ctlr.log("DASH.js is not supported in this browser", "error");
    this.dash = DASHJS.MediaPlayer().create() as DashMediaPlayer;
    if (this.config.type === "audio") this.dash.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: false } }, trackSwitchMode: { audio: "alwaysReplace" } } }); // DASH.js to replace the audio to avoid buffer finish delays
    // Status & State (Bulk Wiring)
    this.dash.on(DASHJS.MediaPlayer.events.PLAYBACK_METADATA_LOADED, () => {
      const autoSwitch = (this.dash!.getSettings() as any).streaming?.abr?.autoSwitchBitrate;
      this.config.state.autoLevel = typeof autoSwitch === "boolean" ? autoSwitch : autoSwitch?.video ?? true; // Fallback logic for v3 vs v4+ API shapes
      this.config.status.levels = this.dash!.getBitrateInfoListFor("video");
      (["text", "audio", "video"] as const).forEach((t) => (this.config.status[`${t}Tracks`] = this.dash!.getTracksFor(t)));
    });
    this.dash.on(DASHJS.MediaPlayer.events.TRACK_CHANGE_RENDERED, (ev: any) => {
      const i = this.dash?.getTracksFor(ev.mediaType)?.findIndex((t) => t.id === ev.newMediaInfo?.id || t.index === ev.newMediaInfo?.index);
      if (isNum(i) && i !== -1) this.config.state[`current${capitalize<TrackType>(ev.mediaType)}Track`] = i;
    });
    this.dash.on(DASHJS.MediaPlayer.events.QUALITY_CHANGE_RENDERED, (ev: any) => ev.mediaType === "video" && (this.config.state.currentLevel = ev.newQuality ?? ev.index)); // v4+ uses newQuality, v3 uses index
    this.dash.on(DASHJS.MediaPlayer.events.FRAGMENT_LOADING_COMPLETED, (ev) => this.ctlr.throttle("dashBandWidth", () => ev.request?.mediaType === "video" && (this.config.status.bandwidth = Math.round((this.dash!.getAverageThroughput("video") / 1000) * 10) / 10), 2000)); // Converted to Mbps, 1 decimal
    this.dash.on(DASHJS.MediaPlayer.events.ERROR, (ev) => {
      if (ev.error === "download") return this.ctlr.log(`DASH Download Error: ${ev.event?.url}`, "warn");
      if (ev.error !== "mediasource") return;
      this.config.status.error = { code: 3, message: ev.error ?? "Fatal DASH error" } as MediaError;
      this.destroyDash();
    });
    this.dash.initialize(this.el, src, false);
  }
  // ===========================================================================
  // WIRING OVERRIDES
  // ===========================================================================
  protected override wireCurrentTrack(type: TrackType, _type = type.toLowerCase() as Lowercase<TrackType>): void {
    this.config.set(`intent.current${type}Track`, (term) => (isNum(term) ? term : this.dash?.getTracksFor(_type)?.findIndex((t) => t.id === term || t.lang === term) ?? -1), { signal: this.signal });
    this.config.on(`intent.current${type}Track`, (e) => this.handleCurrentDashTrackIntent(e, _type), this.evtOpts.CONFIG);
  }
  protected wireCurrentLevel(): void {
    this.config.set("intent.currentLevel", (v) => (isNum(v) ? v : Number(v)), { signal: this.signal }); // #VALIDATOR: rules enforcement
    this.config.on("intent.currentLevel", this.handleCurrentLevelIntent, this.evtOpts.CONFIG);
  }
  protected wireAutoLevel(): void {
    this.config.on("intent.autoLevel", this.handleAutoLevelIntent, this.evtOpts.CONFIG);
  }
  protected override wireActiveCue(): void {
    super.wireActiveCue(false); // DASHJS dynamically injects tracks into the DOM, so the Dash index and DOM index don't match.
  }
  protected wireProtection(): void {
    this.config.on("settings.protection", this.handleProtectionSetting, this.evtOpts.CONFIG);
  }
  // ===========================================================================
  // HANDLERS
  // ===========================================================================
  protected override handleSrcIntent(e: REvent<CtlrMedia, "intent.src">): void {
    if (e.resolved || isSameURL(this.el.src, e.value)) return;
    this.initDash(e.value);
    e.resolve(DashTech.techName);
  }
  protected handleCurrentLevelIntent(e: REvent<CtlrMedia, "intent.currentLevel">): void {
    if (e.resolved || !this.dash) return void (!this.dash && e.reject("DASH unavailable"));
    this.dash.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: false } } } });
    this.dash.setQualityFor("video", e.value as number);
    this.config.state.autoLevel = false;
    e.resolve(DashTech.techName);
  }
  protected handleAutoLevelIntent(e: REvent<CtlrMedia, "intent.autoLevel">): void {
    if (e.resolved || !this.dash) return void (!this.dash && e.reject("DASH unavailable"));
    this.dash.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: e.value } } } });
    this.config.state.autoLevel = e.value as boolean;
    e.resolve(DashTech.techName);
  }
  protected handleCurrentDashTrackIntent(e: REvent<CtlrMedia, `intent.current${TrackType}Track`>, type: Lowercase<TrackType>): void {
    if (e.resolved || !this.dash) return void (!this.dash && e.reject("DASH unavailable"));
    const track = this.config.status[`${type}Tracks`][e.value as number] as dashjs.MediaInfo | undefined;
    if (track) this.dash.setCurrentTrack(track);
    e.resolve(DashTech.techName);
  }
  protected handleProtectionSetting(e: REvent<CtlrMedia, "settings.protection">): void {
    e.value && this.dash?.setProtectionData(e.value);
  }
  // --- Lifecycle ---
  protected destroyDash(): void {
    this.dash?.reset(), (this.dash = null);
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
