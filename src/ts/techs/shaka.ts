import { HTML5Tech } from "./html5";
import type { Controller } from "@core/controller";
import type { CtlrMedia, MediaFeatures } from "@defs/contract";
import { inert, type REvent } from "sia-reactor";
import { DASH_EXTENSIONS, HLS_EXTENSIONS } from "@utils/match";
import { MSE_ENABLED } from "@utils/env";
import { isSameURL } from "@utils/str";
import { isNum } from "@utils/obj";
import { loadResource } from "@utils/dom";
import type { TrackType } from "@utils/media";
import { silence } from "sia-reactor/modules";
// import type * as shaka from 'shaka-player/dist/shaka-player.compiled';
declare global {
  namespace shaka {
    type Player = any;
    namespace extern {
      type Track = any;
    }
  }
} // shaka is notorious for stale types; not us

export default class ShakaTech extends HTML5Tech {
  public static readonly techName: string = "shaka";
  public host: shaka.Player | null = null;
  public static override canPlaySource(src: string): boolean {
    return MSE_ENABLED && (DASH_EXTENSIONS.test(src) || HLS_EXTENSIONS.test(src));
  }
  protected hostSrc: string | null = null;
  protected readonly isAlien: boolean = true;
  constructor(ctlr: Controller, features?: MediaFeatures) {
    const isVid = ctlr.media.type === "video";
    // prettier-ignore
    super(ctlr, {
      // States & Lists
      sources: false, tracks: false, audioTracks: true, videoTracks: isVid, levels: true,
      // States & Currents (Shaka specific)
      currentAudioTrack: true, currentVideoTrack: isVid, currentLevel: true, autoLevel: true,
      // Status & Settings
      bandwidth: true,  protection: true, srcObject: false, ...features
    });
    this.config.status.hostReady = false;
  }
  // --- API Injection ---
  protected async initHost(src = ""): Promise<void> {
    try {
      if (this.host) return this.config.settings.protection && this.host.configure({ drm: this.config.settings.protection }), this.host.load((this.hostSrc = src), this.config[this.ctlr.techTruth].currentTime);
      // Setup & Compatibility
      const SHAKA = (window as any).shaka ?? (await loadResource(window.TMG_SHAKA_JS_SRC!, "script"), (window as any).shaka);
      if (!this.signal || this.signal?.aborted) return; // src may have changed during the `await`
      if (!SHAKA.Player.isBrowserSupported()) return this.ctlr.notice("Shaka Player is not supported in this browser", "error", null);
      SHAKA.polyfill.installAll(); // Mandatory Shaka architecture step
      this.hostSrc = src;
      this.host = new SHAKA.Player();
      // Status & State (Bulk Wiring)
      this.host.addEventListener("trackschanged", () => {
        this.config.status.isLive = this.host.isLive();
        const [aMap, vMap, lMap] = [new Map(), new Map(), new Map()];
        for (const v of this.host.getVariantTracks()) v.height && v.bandwidth && lMap.set(`${v.height}_${v.bandwidth}`, v), v.language && aMap.set(`${v.language}_${v.audioRoles?.join(",")}`, v), vMap.set(v.videoRoles?.join(","), v);
        this.config.status.textTracks = inert(this.host.getTextTracks());
        this.config.status.audioTracks = inert([...aMap.values()]);
        this.config.status.videoTracks = inert([...vMap.values()]);
        this.config.status.levels = inert([...lMap.values()].sort((a: any, b: any) => (b.height !== a.height ? a.height - b.height : a.bandwidth - b.bandwidth))); // ascending, mimicks other libs
        if (this.config.status.hostReady) for (const T of ["TextTrack", "AudioTrack", "VideoTrack", "Level"] as const) silence(() => (this.config.intent[`current${T}`] = this.config.intent[`current${T}`])), this.config.tick(`intent.current${T}`); // #RE-TRIGGER: sync intent resolution
        if (!this.config.settings.metadata.allowMediaOverride) return;
        const chapters = this.host.getChapters(this.config.status.textTracks[this.config.state.currentTextTrack]?.language || this.config.status.audioTracks[this.config.state.currentAudioTrack]?.language || "en");
        this.config.settings.metadata.chapterInfo = inert(chapters?.length ? chapters.map((ch: any) => ({ title: ch.title, startTime: ch.startTime })) : []);
      });
      this.host.addEventListener("variantchanged", this.syncCurrentStats);
      this.host.addEventListener("adaptation", this.syncCurrentStats);
      this.host.addEventListener("texttrackvisibility", () => (this.config.state.textVisible = this.host.isTextTrackVisible()));
      this.host.addEventListener("error", (ev: any) => this.handleHostError(ev.detail));
      await this.host.attach(this.el), this.config.settings.protection && this.host.configure({ drm: this.config.settings.protection });
      await this.host.load(src, this.config[this.ctlr.techTruth].currentTime), (this.config.status.hostReady = true), this.syncCurrentStats();
    } catch (e: any) {
      this.handleHostError(e);
    }
  }
  // ===========================================================================
  // WIRING OVERRIDES
  // ===========================================================================
  protected override wireMediaTracks(): void {}
  protected override wireCurrentTrack(type: TrackType, _type = type.toLowerCase() as Lowercase<TrackType>): void {
    this.config.set(`intent.current${type}Track`, (term) => (isNum(term) ? term : (this.config.status[`${_type}Tracks`] as shaka.extern.Track[]).findIndex((t) => t.id === term || t.label === term || t.language === term)), { signal: this.signal }); // #VALIDATOR: intent type conformation
    this.config.on(`intent.current${type}Track`, (e) => this.handleCurrentHostTrackIntent(e, _type), this.evtOpts.CONFIG);
  }
  protected wireCurrentLevel(): void {
    this.config.set("intent.currentLevel", (term) => (isNum(term) ? term : Number(term)), { signal: this.signal }); // #VALIDATOR: intent type conformation
    this.config.on("intent.currentLevel", this.handleCurrentLevelIntent, this.evtOpts.CONFIG);
  }
  protected override wireTextVisible(): void {
    this.config.on("intent.textVisible", this.handleTextVisibleIntent, this.evtOpts.CONFIG);
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
    this.when("hostReady", e, (variant = (this.config.status.levels as shaka.extern.Track[])[e.value as number]) => variant && (this.useAutoLevel(), this.host.selectVariantTrack(variant, true))); // #VALIDATED: mediated for cast conformity; no-opy // #BULLET-PROOF: must comes clutch // Turn off ABR to force manual selection, true clears buffer
    e.resolve(this.name);
  }
  // protected override handleTextVisibleIntent(e: REvent<CtlrMedia, "intent.textVisible">): void {
  //   if (e.resolved) return;
  //   this.when("hostReady", e, () => (this.host.setTextTrackVisibility(e.value), this.config.state.textVisible = e.value)); // #SKIPPED: not uptight enough; base logic more predictable rn
  //   e.resolve(this.name);
  // }
  protected handleAutoLevelIntent(e: REvent<CtlrMedia, "intent.autoLevel">): void {
    if (e.resolved) return;
    this.when("hostReady", e, () => this.useAutoLevel(e.value));
    e.resolve(this.name);
  }
  protected useAutoLevel(value = false): void {
    this.host.configure({ abr: { enabled: value } });
    this.config.state.autoLevel = value;
  }
  protected handleCurrentHostTrackIntent(e: REvent<CtlrMedia, `intent.current${TrackType}Track`>, type: Lowercase<TrackType>): void {
    if (e.resolved) return;
    this.when("hostReady", e, (target = (this.config.status[`${type}Tracks`] as shaka.extern.Track[])[e.value as number]) => {
      if (!target || type === "text") return target && this.host.selectTextTrack(target), type === "text" && (this.config.state.currentTextTrack = e.value as number);
      const variants = this.host.getVariantTracks(),
        active = variants.find((t: any) => t.active);
      const match = variants.find((v: any, _: any, __: any, vAR = v.audioRoles?.join(), vVR = v.videoRoles?.join()) => {
        const mtchsTgt = type === "audio" ? v.language === target.language && vAR === target.audioRoles?.join() : vVR === target.videoRoles?.join(), // 1. Match the NEW selection the user just clicked
          keepsAlt = type === "audio" ? vVR === active?.videoRoles?.join() : v.language === active?.language && vAR === active?.audioRoles?.join(); // 2. Preserve the OTHER constraint (If changing audio, lock video. If changing video, lock audio)
        return mtchsTgt && keepsAlt && (this.config.state.autoLevel || v.height === active?.height); // 3. STRICTLY PRESERVE RESOLUTION (If ABR is OFF, it must match current height)
      }); // primal behavior, this is no joke; more like a "dance".
      const auto = this.config[this.ctlr.techTruth].autoLevel;
      auto && this.host.configure({ abr: { enabled: false } }), this.host.selectVariantTrack(match || target, true), auto && this.host.configure({ abr: { enabled: true } }); // Fire the weapon safely so Shaka doesn't guess
    });
    e.resolve(this.name);
  }
  // protected override handleLiveIntent(e: REvent<CtlrMedia, "intent.live">): void {
  //   if (e.resolved) return;
  //   this.when("loadedMetadata", e, () => e.value && this.host.goToLive()); // #SKIPPED: not uptight enough; `intent.live` facade for `intent.currentTime` more predictable rn
  //   e.resolve(this.name);
  // }
  // --- API Logic ---
  protected handleHostError(err: any): void {
    if (!this.signal || this.signal?.aborted) return;
    this.config.status.error = { code: err.code ?? 5, message: err.message ?? `Shaka Error: Category ${err.category}`, native: err };
    this.config.status.waiting = false;
  }
  protected syncCurrentStats(): void {
    if (!this.host) return;
    this.config.status.bandwidth = Math.round(this.host.getStats().estimatedBandwidth); // Grab bandwidth stats directly from Shaka's internal engine (bps)
    const active = this.host.getVariantTracks().find((t: any) => t.active);
    if (!active) return;
    this.config.state.currentAudioTrack = (this.config.status.audioTracks as any[]).findIndex((t) => t.language === active.language && t.audioRoles?.join(",") === active.audioRoles?.join(","));
    this.config.state.currentVideoTrack = (this.config.status.videoTracks as any[]).findIndex((t) => t.videoRoles?.join(",") === active.videoRoles?.join(","));
    this.config.state.currentLevel = (this.config.status.levels as any[]).findIndex((l) => l.id === active.id || (l.height === active.height && l.bandwidth === active.bandwidth));
  }
  // --- Lifecycle ---
  protected destroyHost(): void {
    this.host?.destroy(), (this.host = null), (this.config.status.hostReady = false);
  }
  protected override onDestroy(): void {
    this.destroyHost(), super.onDestroy();
  }
}

declare module "@defs/registries" {
  interface TechRegistryMap {
    shaka: typeof ShakaTech;
  }
}
