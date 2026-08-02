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

export class ShakaTech extends HTML5Tech {
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
    this.media.status.hostReady = false;
  }
  // --- API Injection ---
  protected async initHost(src = "") {
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
        const audiosMap = new Map(),
          videosMap = new Map(),
          levelsMap = new Map();
        for (const v of this.host.getVariantTracks()) {
          v.height && v.bandwidth && levelsMap.set(v.height + "_" + v.bandwidth, v);
          v.language && audiosMap.set(v.language + "_" + v.audioRoles?.join(","), v);
          videosMap.set(v.videoRoles?.join(","), v);
        }
        this.config.status.textTracks = inert(this.host.getTextTracks());
        if (this.config.status.hostReady) silence(() => (this.config.intent.currentAudioTrack = this.config.state.currentAudioTrack)); // #RE-TRIGGER: sync intent resolution
        this.config.status.audioTracks = inert(Array.from(audiosMap.values()));
        if (this.config.status.hostReady) silence(() => (this.config.intent.currentAudioTrack = this.config.state.currentAudioTrack)); // #RE-TRIGGER: sync intent resolution
        this.config.status.videoTracks = inert(Array.from(videosMap.values()));
        if (this.config.status.hostReady) silence(() => (this.config.intent.currentVideoTrack = this.config.state.currentVideoTrack)); // #RE-TRIGGER: sync intent resolution
        this.config.status.levels = inert(Array.from(levelsMap.values()).sort((a: any, b: any) => (b.height !== a.height ? a.height - b.height : a.bandwidth - b.bandwidth))); // ascending, mimicks other libs
        if (!this.config.settings.metadata.allowMediaOverride) return;
        const chapters = this.host.getChapters(this.config.status.textTracks[this.config.state.currentTextTrack]?.language || this.config.status.audioTracks[this.config.state.currentAudioTrack]?.language || "en");
        this.config.settings.metadata.chapterInfo = inert(chapters?.length ? chapters.map((ch: any) => ({ title: ch.title, startTime: ch.startTime })) : []);
      });
      this.host.addEventListener("variantchanged", this.syncCurrentLevel);
      this.host.addEventListener("adaptation", this.syncCurrentLevel);
      this.host.addEventListener("error", (ev: any) => this.handleHostError(ev.detail));
      await this.host.attach(this.el), this.config.settings.protection && this.host.configure({ drm: this.config.settings.protection });
      await this.host.load(src, this.config[this.ctlr.techTruth].currentTime), (this.media.status.hostReady = true), this.syncCurrentLevel();
    } catch (e: any) {
      this.handleHostError(e);
    }
  }
  // ===========================================================================
  // WIRING OVERRIDES
  // ===========================================================================
  protected override wireMediaTracks(): void {}
  protected override wireCurrentTrack(type: TrackType, _type = type.toLowerCase() as Lowercase<TrackType>): void {
    this.config.set(`intent.current${type}Track`, (term) => (isNum(term) ? term : (this.config.status[`${_type}Tracks`] as shaka.extern.Track[]).findIndex((t) => t.id === term || t.language === term)), { signal: this.signal }); // #VALIDATOR: intent type conformation
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
    this.when("hostReady", e, () => {
      const variant = (this.config.status.levels as shaka.extern.Track[])[e.value as number]; // #VALIDATED: mediated for cast conformity; no-opy
      if (variant) {
        this.host.configure({ abr: { enabled: false } }), this.host.selectVariantTrack(variant, true); // Turn off ABR to force manual selection, true clears buffer
        this.config.state.autoLevel = false;
      }
    });
    e.resolve(this.name);
  }
  protected handleAutoLevelIntent(e: REvent<CtlrMedia, "intent.autoLevel">): void {
    if (e.resolved) return;
    this.when("hostReady", e, () => {
      this.host.configure({ abr: { enabled: e.value } });
      this.config.state.autoLevel = e.value as boolean;
    });
    e.resolve(this.name);
  }
  protected handleCurrentHostTrackIntent(e: REvent<CtlrMedia, `intent.current${TrackType}Track`>, type: Lowercase<TrackType>): void {
    if (e.resolved) return;
    this.when("hostReady", e, () => {
      const target = (this.config.status[`${type}Tracks`] as shaka.extern.Track[])[e.value as number];
      if (!target) return void e.resolve(this.name);
      if (type === "text") this.host.selectTextTrack(target);
      else {
        const variants = this.host.getVariantTracks(),
          active = variants.find((t: any) => t.active),
          match = variants.find((v: any) => {
            const matchesTgt = type === "audio" ? v.language === target.language && v.audioRoles?.join() === target.audioRoles?.join() : v.videoRoles?.join() === target.videoRoles?.join(), // 1. Match the NEW selection the user just clicked
              preservesAlt = type === "audio" ? v.videoRoles?.join() === active?.videoRoles?.join() : v.language === active?.language && v.audioRoles?.join() === active?.audioRoles?.join(), // 2. Preserve the OTHER constraint (If changing audio, lock video. If changing video, lock audio)
              matchesRes = this.config.state.autoLevel || v.height === active?.height; // 3. STRICTLY PRESERVE RESOLUTION (If ABR is OFF, it must match current height)
            return matchesTgt && preservesAlt && matchesRes;
          });
        this.host.selectVariantTrack(match || target, true); // Fire the weapon safely using selectVariantTrack so Shaka doesn't guess
      }
    }); // primal behavior, this is no joke; more like a "dance".
    e.resolve(this.name);
  }
  // skipped override for `handleLiveIntent(e)` (`this.host.goToLive()`) so `intent.live` facade for `intent.currentTime` remains predictable
  // --- API Logic ---
  protected handleHostError(err: any): void {
    if (!this.signal || this.signal?.aborted) return;
    this.config.status.error = { code: err.code ?? 5, message: err.message ?? `Shaka Error: Category ${err.category}`, native: err };
    this.config.status.waiting = false;
  }
  protected syncCurrentLevel(): void {
    if (!this.host) return;
    const variants = this.host.getVariantTracks(),
      idx = variants.findIndex((t: any) => t.active);
    if (idx !== -1) {
      const active = variants[idx];
      this.config.state.currentLevel = (this.config.status.levels as any[]).findIndex((l) => l.id === active.id || (l.height === active.height && l.bandwidth === active.bandwidth));
    }
    this.config.status.bandwidth = Math.round(this.host.getStats().estimatedBandwidth); // Grab bandwidth stats directly from Shaka's internal engine (bps)
  }
  // --- Lifecycle ---
  protected destroyHost(): void {
    this.host?.destroy(), (this.host = null), (this.media.status.hostReady = false);
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
