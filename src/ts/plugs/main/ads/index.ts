import { BasePlug } from "../../base";
import { BaseTech } from "@techs/base";
import { IMATech } from "@techs/ima";
import { mergeObjs, deepClone, parsePathObj } from "sia-reactor/utils";
import type { AdsConfig, AdRoll, AdsState } from "./types";
import { ADS_BUILD, AD_ROLL_BUILD } from "./build";
import { createEl, loadResource } from "@utils/dom";
import { getMediaMax } from "@utils/time";
import { REvent } from "sia-reactor";
import { CtlrMedia } from "@defs/contract";
import type { Controller } from "@core/controller";
import { silence } from "sia-reactor/modules";
import { CtlrConfig } from "@defs/config";

export class AdsPlug extends BasePlug<AdsConfig, AdsState> {
  public static readonly plugName = "ads";
  public static readonly isMain: boolean = true;
  public static readonly BUILD = ADS_BUILD;
  public loader!: google.ima.AdsLoader;
  public manager: google.ima.AdsManager | null = null;
  public displayContainer!: google.ima.AdDisplayContainer;
  public container!: HTMLDivElement;
  public points: Map<number, AdRoll> = new Map();
  public imTech: IMATech | null = null; // Interactive Media
  public bgTech: BaseTech | null = null; // Background

  constructor(ctlr: Controller, config = ctlr.config.ads) {
    super(ctlr, config, { roll: null });
  }

  public override mount(): void {
    this.container = createEl("div", { className: "tmg-media-ads-container tmg-media-filtered" });
    // DOM Injection
    this.ctlr.DOM.controlsContainer?.prepend(this.container);
    // Post Mounting
  }
  protected async initSDK(): Promise<void> {
    if (this.media.status.IMAReady) return;
    try {
      if ("undefined" === typeof google || "undefined" === typeof google.ima) await loadResource(window.TMG_IMA_SDK_SRC!, "script");
      google.ima.settings.setVpaidMode(this.config.options.vpaidMode), google.ima.settings.setNumRedirects(this.config.options.maxRedirects);
      google.ima.settings.setLocale(this.config.options.locale), google.ima.settings.setFeatureFlags({ audioPosterImageEnabled: true, audioPosterImageDefaultUrl: window.TMG_MEDIA_ALT_IMG_SRC });
      this.displayContainer = new google.ima.AdDisplayContainer(this.container);
      document.addEventListener("click", () => (this.displayContainer.initialize(), (this.media.status.IMAInitialized = true)), { once: true, signal: this.signal });
      this.loader = new google.ima.AdsLoader(this.displayContainer);
      this.loader.addEventListener(google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED, this.handleManagerLoaded, false);
      this.loader.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, this.handleError, false);
      this.media.status.IMAReady = true;
    } catch (err) {
      this.ctlr.log(err, "error", true); // #LESS: error not worth notifying
    }
  }
  public override unmount(): void {
    this.container?.remove();
  }

  public override wire(): void {
    // Ctlr Config Setters
    this.ctlr.config.set("ads.rolls", (v) => v.map((r) => mergeObjs(deepClone(AD_ROLL_BUILD), parsePathObj(r))), { init: true, signal: this.signal });
    // ---- Media Watchers
    for (const p of ["tech", "status.IMAReady"] as const) this.media.watch(p, this.syncFeatures, { signal: this.signal });
    // ----------- Listeners
    this.media.on("intent.currentTime", ({ value }) => this.pollRolls(value), { signal: this.signal });
    this.media.on("state.currentTime", ({ value }) => this.pollRolls(value), { signal: this.signal });
    this.media.on("status.ended", ({ value }) => value && !this.media.status.ads && this.loader?.contentComplete(), { signal: this.signal });
    this.media.on("status.ads", this.handleAdsStatus, { signal: this.signal });
    // ---- State --------
    for (const p of ["width", "height"] as const) this.ctlr.state.on(`dimensions.container.${p}`, ({ target: { object } }) => this.manager?.resize(object.width, object.height), { signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("ads.rolls", this.handleRolls, { depth: 2, init: true, signal: this.signal }); // [n].played
    // Post Wiring
    this.ctlr.learn("skipAd", { fn: this.skipRoll }, this.signal), super.wire();
  }

  protected handleAdsStatus({ value }: REvent<CtlrMedia, "status.ads">): void {
    this.media.container.classList.toggle("tmg-media-ads", value); //, this.media.container.classList.toggle("tmg-media-ima", value); // replay or link awayy?
    const tl = this.ctlr.plug("settings.controlPanel")?.comp("timeline");
    if (tl) value ? ((this.prevReadonly = tl.config.readonly), (tl.config.readonly = true)) : (tl.config.readonly = this.prevReadonly);
  }
  private prevReadonly = false;

  protected handleRolls(e?: REvent<CtlrConfig, "ads.rolls", 2>): void {
    e && (e.path === "ads.rolls" || !isNaN(e.target.key as any)) && this.syncFeatures();
    const handle = (max = getMediaMax(this.media), points = new Set<number>(), tPlug = this.ctlr.plug("settings.time")) => {
      if (this.media.status.ads) return;
      this.points.clear();
      for (const roll of this.config.rolls) {
        if (roll.played) continue;
        let time = tPlug?.toTime(roll.time) ?? +roll.time;
        time = time < 0 ? (max > 0 && Number.isFinite(max) ? Math.max(0, max + time) : -1) : time;
        if (time >= 0 && time <= max) points.add(time), this.points.set(time, roll);
      }
      if (this.manager) for (const p of this.manager.getCuePoints()) points.add(p === -1 ? (max > 0 && Number.isFinite(max) ? max : -1) : p);
      this.media.status.adPoints = Array.from(points).sort((a, b) => a - b);
    };
    this.ctlr.when("loadedMetadata", e, handle, this.signal);
  }

  protected handleManagerLoaded(e: google.ima.AdsManagerLoadedEvent, set = new google.ima.AdsRenderingSettings()): void {
    this.manager = (this.manager?.destroy(), e.getAdsManager(this.media.state, ((set.uiElements = []), set)));
    this.manager.addEventListener(google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED, this.handlePauseRequest);
    this.manager.addEventListener(google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED, this.handleResumeRequest);
    this.manager.addEventListener(google.ima.AdEvent.Type.SKIPPABLE_STATE_CHANGED, this.syncFeatures);
    this.manager.addEventListener(google.ima.AdEvent.Type.ALL_ADS_COMPLETED, this.handleAllCompleted);
    this.manager.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, this.handleError);
    const start = () => (this.manager.init(this.ctlr.state.dimensions.container.width, this.ctlr.state.dimensions.container.height), this.manager.start()); // #HEAVY: waits for lightState
    this.handleRolls(), this.ctlr.when("IMAInitialized", undefined, () => (this.ctlr.flags.played ? start() : this.ctlr.state.wonce("readyState", start, { signal: this.signal })), this.signal); // #PATIENT: only after first play
  }

  protected handlePauseRequest(): void {
    silence(() => (this.media.intent.paused = true)), this.media.tick("intent.paused");
    (this.bgTech = this.media.tech).hibernate();
    const method = !this.imTech ? "setup" : "awaken";
    this.media.tech = this.imTech ??= new IMATech(this.ctlr);
    this.media.status.ads = true; // b4 sets
    this.media.tech[method]();
  }
  protected handleResumeRequest(): void {
    if (!this.media.status.ads) return;
    this.imTech!.hibernate();
    (this.media.tech = this.bgTech!).awaken();
    this.media.status.ads = false;
    this.handleRolls();
  }
  protected handleAllCompleted(): void {
    this.handleResumeRequest(), this.manager?.destroy(), (this.manager = this.state.roll = null);
  }
  protected handleError(e: google.ima.AdErrorEvent): void {
    this.ctlr.log(e?.getError?.() ?? e, "error", true), this.handleAllCompleted(); // #LESS: error not worth notifying
  }

  protected playRoll(roll?: AdRoll): void {
    if (!roll || this.state.roll) return;
    this.ctlr.when("IMAReady", undefined, () => {
      const req = new google.ima.AdsRequest();
      req.adTagUrl = (this.state.roll = roll).url;
      req.nonLinearAdSlotWidth = req.linearAdSlotWidth = this.ctlr.state.dimensions.container.width;
      req.nonLinearAdSlotHeight = req.linearAdSlotHeight = this.ctlr.state.dimensions.container.height;
      this.loader.requestAds(req);
    });
  }
  public skipRoll(): void {
    this.manager?.skip();
  }

  public pollRolls(time: number, { loadedMetadata, seeking, ads, adPoints } = this.media.status): void {
    if (!loadedMetadata || ads || seeking) return;
    if (time > this.prevTime) {
      let max = -1;
      for (let i = 0, len = adPoints.length; i < len; i++) {
        const pnt = adPoints[i];
        if (pnt > this.prevTime && pnt <= time && pnt >= max) max = pnt;
      }
      max !== -1 && this.playRoll(this.points.get(max));
    }
    this.prevTime = time < this.prevTime ? time - 0.001 : time;
  }
  private prevTime = -1;

  public syncFeatures(): void {
    this.config.rolls.length && this.initSDK(); // #HEAVY: still in lightState
    this.media.tech.polyfill("ads", this.media.status.IMAReady && (this.state.roll || this.config.rolls.length));
    this.media.tech.polyfill("adSkip", this.manager?.getAdSkippableState());
  }

  protected override onDestroy(): void {
    this.manager?.destroy(), this.loader?.destroy(), this.imTech?.destroy();
    super.onDestroy();
  }
}

export type * from "./types";
export * from "./build";

declare module "@defs/config" {
  interface CtlrConfig {
    ads: AdsConfig;
  }
}

declare module "@defs/contract" {
  interface MediaStatus {
    IMAReady: boolean;
    IMAInitialized: boolean;
  }
}

declare module "@defs/registries" {
  interface PlugRegistryMap {
    ads: typeof AdsPlug;
  }
}
