import { BasePlug } from "../../base";
import type { AmbienceConfig, AmbienceState } from "./types";
import { AMBIENT_BUILD } from "./build";
import { createEl } from "@utils/dom";
import { MenuRegistry } from "@core/registries";
import { CtlrMedia } from "@defs/contract";
import { REvent } from "sia-reactor";
import { Controller } from "@core/controller";

export class AmbiencePlug extends BasePlug<AmbienceConfig, AmbienceState> {
  public static readonly plugName = "ambience";
  public static readonly BUILD = AMBIENT_BUILD;
  public wrapper!: HTMLDivElement;
  public canvas!: HTMLCanvasElement;
  public context!: CanvasRenderingContext2D | null;
  public get canPulse(): boolean {
    return this.ctlr.isNativeEl && this.media.type !== "audio";
  }
  private posterImg?: HTMLImageElement;
  private posterSeq = 0;

  constructor(ctlr: Controller, config = ctlr.settings.ambience) {
    super(ctlr, config, { snubbing: false });
  }

  public override mount(): void {
    // Variables Assignment
    this.wrapper = createEl("div", { className: "tmg-media-ambience-wrapper tmg-media-filtered", ariaHidden: "true" });
    this.canvas = createEl("canvas", { className: "tmg-media-ambience-canvas" });
    this.context = this.canvas.getContext("2d", { alpha: false });
    // DOM Injection
    this.ctlr.DOM.containerContent?.prepend((this.wrapper.append(this.canvas), this.wrapper));
  }
  public override unmount(): void {
    this.canvas.remove();
  }

  public override wire(): void {
    // Plug Listeners
    this.ctlr.plug("settings.poster")?.state.on("visible", ({ value }) => value && this.syncGlow(true), { signal: this.signal });
    // State Listeners
    this.state.on("snubbing", ({ value }) => this.syncDisplay(!value), { signal: this.signal });
    // Ctlr Media Watchers
    this.media.watch("tech", this.syncFeatures, { init: true, signal: this.signal });
    // --------- Listeners
    this.media.on("type", () => this.syncGlow(), { signal: this.signal });
    this.media.on("features.ambience", ({ value }) => this.syncDisplay(!!value), { signal: this.signal });
    this.media.on("intent.ambience", this.handleAmbienceIntent, { capture: true, init: this.ctlr.payload.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    this.media.on("state.currentTime", this.pulseGlow, { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("state.poster", this.syncFeatures, { init: this.ctlr.payload.wired, signal: this.signal });
    // ---- State ---------
    this.ctlr.state.on("dimensions.container.width", this.syncSize, { init: true, signal: this.signal });
    this.ctlr.state.on("dimensions.container.height", this.syncSize, { signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.ambience.blur", this.syncFilter, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.ambience.opacity", this.syncFilter, { signal: this.signal });
    // Post Wiring
    super.wire();
  }

  protected handleAmbienceIntent(e: REvent<CtlrMedia, "intent.ambience">): void {
    this.state.snubbing = !!e.resolved;
    if (e.resolved) return;
    this.syncDisplay(e.value);
    this.media.state.ambience = e.value;
    e.resolve(this.name);
  }

  protected pulseGlow(): void {
    this.canPulse && this.ctlr.throttle("ambienceGlowing", this.syncGlow, this.config.interval, false, this.signal);
  }
  protected syncGlow(usePoster = !this.canPulse || !!this.ctlr.plug("settings.poster")?.state.visible, flush = usePoster): void {
    if (this.state.snubbing || !this.media.state.ambience || !this.media.features.ambience || !this.ctlr.state.mediaIntersecting || !this.context) return;
    (this.context.globalAlpha = flush ? 1.0 : this.config.smoothness), flush && this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (usePoster) {
      const seq = ++this.posterSeq,
        i = this.posterImg && this.posterImg.src === this.media.state.poster ? this.context.drawImage(this.posterImg, 0, 0, this.canvas.width, this.canvas.height) : (this.posterImg = createEl("img", { crossOrigin: "anonymous", src: this.media.state.poster, onload: () => seq === this.posterSeq && this.context?.drawImage(i as HTMLImageElement, 0, 0, this.canvas.width, this.canvas.height) }));
    } else if (!this.ctlr.isNativeEl || this.media.element.readyState < 1) return;
    else this.context.drawImage(this.media.element as HTMLVideoElement, 0, 0, this.canvas.width, this.canvas.height);
  }
  protected syncSize(): void {
    this.canvas.width = 32; // Small resolution is heavily performant for blurs; preserve aspect ratio
    this.canvas.height = Math.round(32 / (this.ctlr.state.dimensions.container.width / this.ctlr.state.dimensions.container.height));
    this.syncGlow();
  }
  protected syncDisplay(show: boolean): void {
    (this.canvas.style.display = !show ? "none" : "block"), show && this.media.status.readyState && this.syncGlow();
  }
  protected syncFilter(): void {
    this.canvas.style.filter = `blur(${this.config.blur}px) opacity(${this.config.opacity})`;
  }

  protected syncFeatures(): void {
    this.media.features.ambience ||= !this.canPulse ? !!this.media.state.poster : true;
  }

  protected override registerMenu(): void {
    this.ctlr.plug("settings.settingsView")?.menu.registerFirst(MenuRegistry.get("settings.ambience")?.(this));
  }
}

export type * from "./types";
export * from "./build";

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.ambience": typeof AmbiencePlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    ambience: AmbienceConfig;
  }
}
