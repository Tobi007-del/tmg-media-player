import { BasePlug } from "../../base";
import type { CssConfig } from "./types";
import { CSS_BUILD } from "./build";
import type { CtlrMedia } from "@defs/contract";
import type { REvent } from "sia-reactor";
import { uncamelize } from "@utils/str";

export class CSSPlug extends BasePlug<CssConfig> {
  public static readonly plugName = "css";
  public static readonly BUILD = CSS_BUILD;
  public classKeys: string[] = ["captionsCharacterEdgeStyle", "captionsTextAlignment"]; // #DEFAULT: build privilege
  public _cache: Record<string, string | number> = {};

  public override wire(): void {
    // Variables Assignment
    const entries = Object.entries(this.config);
    this.settings.css.altImgUrl = `url(${window.TMG_MEDIA_ALT_IMG_SRC})`;
    // Blackbox Handlers
    this.ctlr.config.get("*", (val, { target: { key, path } }: any) => (!path.startsWith("settings.css.") || banRgx.test(path) ? val : ((val = this.get(key)), (this._cache[key] ||= val), val)), { signal: this.signal }); // #BLACKBOX: immediacy requirement
    this.ctlr.config.watch("*", (val, { target: { key, path } }: any) => path.startsWith("settings.css.") && !banRgx.test(path) && this.set(key, val), { signal: this.signal }); // #BLACKBOX: immediacy requirement
    // ---- Media Watchers
    this.media.watch("status.videoWidth", this.syncAspectRatio, { init: true, signal: this.signal });
    this.media.watch("status.videoHeight", this.syncAspectRatio, { signal: this.signal });
    // ---- State --------
    this.ctlr.state.watch("dimensions.container.width", (w) => (this.settings.css.currentContainerWidth = `${w || 0}px`), { init: true, signal: this.signal });
    this.ctlr.state.watch("dimensions.container.height", (h) => (this.settings.css.currentContainerHeight = `${h || 0}px`), { init: true, signal: this.signal });
    // ---- Media Listeners
    this.media.on("status.loadedMetadata", this.handleLoadedMetadataStatus, { init: this.ctlr.payload.wired, signal: this.signal });
    // ---- State ----------
    this.ctlr.state.on("dimensions.container.tier", ({ value: tier }) => (this.media.container.dataset.sizeTier = tier || ""), { init: true, signal: this.signal });
    this.ctlr.state.on("dimensions.pseudoContainer.tier", ({ value: tier }) => (this.media.pseudoContainer.dataset.sizeTier = tier || ""), { init: true, signal: this.signal });
    // Post Wiring
    for (const [k, v] of entries) k !== "syncWithMedia" && ((this._cache[k] ||= this.config[k]), this.set(k, v));
    super.wire();
  }

  protected async handleLoadedMetadataStatus({ value }: REvent<CtlrMedia, "status.loadedMetadata">): Promise<void> {
    const color = value && (await this.ctlr.plug("settings.frame")?.getMainColor());
    for (const k of Object.keys(this.settings.css.syncWithMedia).filter((k) => this.settings.css.syncWithMedia[k])) this.settings.css[k] = String((value ? color : null) ?? this._cache[k]);
  }

  protected getCSSValue(key: string): string {
    const cssVar = `--tmg-media-${uncamelize(key, "-")}`,
      val = getComputedStyle(this.media.container).getPropertyValue(cssVar);
    return val;
  }
  protected getClassValue(key: string): string {
    const prefix = `tmg-media-${uncamelize(key, "-")}`,
      val = Array.prototype.find.call(this.media.container.classList, (c) => c.startsWith(prefix))?.replace(`${prefix}-`, "");
    return val || "none"; // Validation logic (can be expanded to use tmg.parseUIObj if available)
  }

  protected setCssVariable(key: string, value: any): void {
    const strVal = String(value),
      cssVar = `--tmg-media-${uncamelize(key, "-")}`;
    for (const el of [this.media.container, this.media.pseudoContainer]) el?.style.setProperty(cssVar, strVal);
  }
  protected setClassValue(key: string, value: any): void {
    const pre = `tmg-media-${uncamelize(key, "-")}`;
    for (const c of this.media.container.classList) c.startsWith(pre) && this.media.container.classList.remove(c);
    this.media.container.classList.add(`${pre}-${value}`);
  }

  protected get(key: string): string | number {
    return this[this.classKeys.includes(key) ? "getClassValue" : "getCSSValue"](key);
  }
  protected set(key: string, value: any): void {
    this[this.classKeys.includes(key) ? "setClassValue" : "setCssVariable"](key, value);
  }

  public syncAspectRatio(): void {
    const { videoWidth: w, videoHeight: h } = this.media.status;
    this.settings.css.aspectRatio = w && h ? `${w} / ${h}` : "16 / 9";
  }
}
const banRgx = /\.(?:(constructor|syncWithMedia))/; // __proto__|prototype|toString|valueOf|hasOwnProperty|

export type * from "./types";
export * from "./build";

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.css": typeof CSSPlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    css: CssConfig;
  }
}
