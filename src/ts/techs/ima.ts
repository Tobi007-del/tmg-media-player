import { IconRegistry } from "@core/registries";
import { BaseTech } from "./base";
import type { Controller } from "@core/controller";
import type { CtlrMedia, MediaFeatures } from "@defs/contract";
import { type REvent } from "sia-reactor";
import { silence } from "sia-reactor/modules";
import { fanout, deepClone, clamp } from "sia-reactor/utils";
import { formatActionForDisplay } from "@utils/keys";

export class IMATech extends BaseTech<HTMLIFrameElement> {
  public static readonly techName = "ima";
  public get plug() {
    return this.ctlr.plug("ads")!;
  }
  public get host() {
    return this.plug.manager!;
  }
  public cache: Partial<CtlrMedia> | null = null;
  public activeAd: google.ima.Ad | null = null;
  protected readonly TIDS = { SKIP: `tmg-media-ads-skip-for-${this.ctlr.config.id}`, SITE: `tmg-media-ads-site-for-${this.ctlr.config.id}` };
  constructor(ctlr: Controller, features?: MediaFeatures) {
    // prettier-ignore
    super(ctlr, {
      // Engine Inputs
      volume: true, muted: true,
      // States 
      autoplay: true, playsInline: true, objectFit: false,
      // Infos
      readyState: true, error: true, loadedMetadata: true, loadedData: true, canPlay: true,
      // Extensions
      ads: true, ...features
    });
    ctlr.config.courtesy = "IMA"; // Don't say, I never did nothing for you
    this.element = this.plug.container.querySelector<HTMLIFrameElement>("iframe")!;
  }
  public override mount(): void {}
  public override unmount(): void {}
  protected override onAwaken(): void {
    this.cache = deepClone({ state: this.config.state, status: this.config.status, settings: this.config.settings, features: this.config.features }); // all that once was
    super.onAwaken(), silence(() => fanout(this.config, this.plug.state.roll!.media, { cloneSets: true }));
  }
  protected override onHibernate(): void {
    super.onHibernate(), this.cache && silence(() => fanout(this.config, this.cache!)); // all that will be
    this.skipBtn = this.activeAd = this.cache = null;
  }
  // ===========================================================================
  // WIRING (Connections Only)
  // ===========================================================================
  // --- Core Wiring ---
  protected override wireSrc(): void {}
  protected override wireCurrentTime(): void {
    this.config.on("intent.currentTime", this.handleCurrentTimeIntent, this.evtOpts.CONFIG);
  }
  protected override wireDuration(): void {}
  protected override wirePaused(): void {
    this.config.on("intent.paused", this.handlePausedIntent, this.evtOpts.CONFIG);
  }
  protected override wireEnded(): void {}
  protected override wireFeatures(): void {
    super.wireFeatures();
    this.host.addEventListener(google.ima.AdEvent.Type.STARTED, this.handleStarted);
    this.host.addEventListener(google.ima.AdEvent.Type.AD_PROGRESS, this.handleProgress);
    this.host.addEventListener(google.ima.AdEvent.Type.PAUSED, this.setPauseState);
    this.host.addEventListener(google.ima.AdEvent.Type.RESUMED, this.setPlayState);
    this.host.addEventListener(google.ima.AdEvent.Type.VOLUME_CHANGED, this.setVolumeChangeState);
    this.host.addEventListener(google.ima.AdEvent.Type.VOLUME_MUTED, this.setVolumeChangeState);
  }
  // --- Engine Inputs Wiring ---
  protected wireVolume(): void {
    this.config.on("intent.volume", this.handleVolumeIntent, this.evtOpts.CONFIG);
  }
  protected wireMuted(): void {
    this.config.on("intent.muted", this.handleMutedIntent, this.evtOpts.CONFIG);
  }
  // ===========================================================================
  // HANDLERS (The Logic - Auto-Guarded)
  // ===========================================================================
  // --- Core States ---
  protected setPauseState(): void {
    this.config.state.paused = true;
  }
  protected setPlayState(): void {
    this.config.state.paused = false;
  }
  // --- Core Intents ---
  protected handlePausedIntent(e: REvent<CtlrMedia, "intent.paused">): void {
    if (e.resolved) return;
    this.host[e.value ? "pause" : "resume"]();
    e.resolve(this.name);
  }
  protected handleCurrentTimeIntent(e: REvent<CtlrMedia, "intent.currentTime">): void {
    !e.resolved && e.resolve(this.name); // IMA has no seek API
  }
  // --- Feature States ---
  protected setVolumeChangeState(): void {
    this.config.state.muted = this.cache!.state!.muted = (this.config.state.volume = this.cache!.state!.volume = this.host.getVolume() * 100) === 0;
  }
  // --- Feature Intents ---
  protected handleVolumeIntent(e: REvent<CtlrMedia, "intent.volume">): void {
    if (e.resolved) return;
    if (e.value < 0 || e.value > 100) e.reject(this.name); // Out of bounds
    this.host.setVolume(clamp(0, e.value, 100) / 100);
    e.resolve(this.name);
  }
  protected handleMutedIntent(e: REvent<CtlrMedia, "intent.muted">): void {
    if (e.resolved) return;
    this.host.setVolume(e.value ? 0 : this.config.state.volume / 100);
    e.resolve(this.name);
  }
  // --- API Logic ---
  protected handleStarted(e: google.ima.AdEvent, ad = (this.activeAd = e.getAd()), title = ad?.getTitle() || this.config.settings.metadata.title, advertiser = ad?.getAdvertiserName() || this.config.settings.metadata.artist, url = ad?.getSurveyUrl() || this.config.settings.metadata.links.title): void {
    if (!ad) return;
    this.config.status.duration = ad.getDuration();
    this.config.status.canPlay = this.config.status.loadedData = this.config.status.loadedMetadata = true;
    this.config.status.readyState = 4;
    this.config.settings.metadata.allowMediaOverride && silence(() => fanout(this.config.settings.metadata, { title, artist: advertiser, links: { title: url } } as any));
    this.config.state.paused = this.cache!.state!.paused = false;
    this.plug.state.roll!.played = true;
    this.ctlr.toast?.(`<span class="tmg-media-ads-toast-title">${title || advertiser || ""}</span>${url ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>` : ""}`, { id: this.TIDS.SITE, signal: this.signal, image: this.config.settings.metadata.profile, ...this.plug.state.roll!.toasts.meta });
  }
  protected handleProgress(e: google.ima.AdEvent, ad = e.getAd() ?? this.activeAd, data = e.getAdData() as google.ima.AdProgressData | null, offset = ad?.getSkipTimeOffset() ?? -1): void {
    if (!ad || !data) return t007.toast?.dismiss(this.TIDS.SKIP);
    this.config.state.currentTime = data.currentTime;
    const render = `<span class="tmg-media-ads-toast-meta">${this.plug.state.roll!.badge}<span class="tmg-media-ads-toast-count"> • ${data.adPosition} of ${data.totalAds}</span></span>`;
    if (!t007.toast?.isActive(this.TIDS.SKIP)) return void this.ctlr.toast?.(render, { id: this.TIDS.SKIP, signal: this.signal, actions: offset === -1 ? false : { [`<span title='Skip ad${formatActionForDisplay(this.settings.keys.shortcuts.skipAd, this.settings.voice.commands.skipAd)}' class="tmg-media-ads-toast-skip"}></span>`]: this.plug.skipRoll }, ...this.plug.state.roll!.toasts.skip });
    this.ctlr.toast?.update(this.TIDS.SKIP, { render });
    if ((this.skipBtn ??= this.ctlr.queryDOM(".tmg-media-ads-toast-skip"))) (this.skipBtn.innerHTML = `Skip ${this.config.features.adSkip ? `<span>${IconRegistry.get("next")}</span>` : ` in ${Math.max(1, Math.ceil(offset - data.currentTime))}`}`), this.skipBtn.classList.toggle("tmg-media-control-disabled", !this.config.features.adSkip);
  }
  private skipBtn: HTMLButtonElement | null = null;
}
