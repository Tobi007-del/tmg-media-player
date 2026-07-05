import { BasePlug } from "../../base";
import type { AmbienceConfig } from "./types";
import { AMBIENT_BUILD } from "./build";
import { createEl } from "@utils/dom";
import { MenuRegistry } from "@core/registries";

export class AmbiencePlug extends BasePlug<AmbienceConfig> {
  public static readonly plugName = "ambience";
  public static readonly BUILD = AMBIENT_BUILD;
  public wrapper!: HTMLDivElement;
  public canvas!: HTMLCanvasElement;
  public context!: CanvasRenderingContext2D | null;

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
    // Ctlr Media Watchers
    this.media.watch("tech", this.syncFeatures, { init: true, signal: this.signal });
    // --------- Listeners
    this.media.on("state.currentTime", this.pulseGlow, { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("state.poster", this.syncFeatures, { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("features.ambience", ({ value }) => this.syncDisplay(!!value), { signal: this.signal });
    // ---- State ---------
    this.ctlr.state.on("dimensions.container.width", this.syncSize, { init: true, signal: this.signal });
    this.ctlr.state.on("dimensions.container.height", this.syncSize, { signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.ambience.active", ({ value }) => this.syncDisplay(value), { init: true, signal: this.signal });
    this.ctlr.config.on("settings.ambience.blur", this.syncFilter, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.ambience.opacity", this.syncFilter, { signal: this.signal });
    // Post Wiring
    super.wire();
  }

  protected pulseGlow(): void {
    this.ctlr.isNativeEl && this.media.type !== "audio" && this.ctlr.throttle("ambienceGlowing", this.syncGlow, this.config.interval, false);
  }
  protected syncGlow(usePoster = !this.ctlr.isNativeEl || this.media.type === "audio"): void {
    if (!this.config.active || !this.media.features.ambience || !this.ctlr.state.mediaIntersecting || !this.context) return;
    if (usePoster) {
      if (!this.media.state.poster) return this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
      const seq = ++this.posterSeq,
        i = this.posterImg && this.posterImg.src === this.media.state.poster ? this.context.drawImage(this.posterImg, 0, 0, this.canvas.width, this.canvas.height) : (this.posterImg = createEl("img", { src: this.media.state.poster, crossOrigin: "anonymous", onload: () => seq === this.posterSeq && this.context?.drawImage(i as HTMLImageElement, 0, 0, this.canvas.width, this.canvas.height) }));
    } else if (!this.ctlr.isNativeEl || this.media.element.readyState < 2) return;
    this.context.globalAlpha = this.config.smoothness;
    this.context.drawImage(this.media.element as HTMLVideoElement, 0, 0, this.canvas.width, this.canvas.height);
  }
  private posterSeq = 0;
  private posterImg?: HTMLImageElement;

  protected syncSize(): void {
    this.canvas.width = 32; // Small resolution is heavily performant for blurs; preserve aspect ratio
    this.canvas.height = Math.round(32 / (this.ctlr.state.dimensions.container.width / this.ctlr.state.dimensions.container.height));
    this.syncGlow();
  }

  protected syncDisplay(show: boolean): void {
    (this.canvas.style.display = !show ? "none" : "block"), show && this.syncGlow();
  }

  protected syncFilter(): void {
    this.canvas.style.filter = `blur(${this.config.blur}px) opacity(${this.config.opacity})`;
  }

  protected syncFeatures(): void {
    (this.media.features.ambience ||= !!this.media.state.poster), this.syncGlow();
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

declare module "@defs/contract" {
  interface MediaExtraFeatures {
    ambience: boolean;
  }
}
