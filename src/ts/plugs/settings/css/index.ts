import { BasePlug } from "../../base";
import type { CssConfig } from "./types";
import { CSS_BUILD } from "./build";
import type { CtlrMedia } from "@defs/contract";
import type { REvent } from "sia-reactor";
import { uncamelize } from "@utils/str";

export class CSSPlug extends BasePlug<CssConfig> {
  public static readonly plugName = "css";
  public static readonly BUILD = CSS_BUILD;
  public classKeys: string[] = ["captionsCharacterEdgeStyle"]; // #DEFAULT: build privilege
  public _cache: Record<string, string | number | undefined> = {};

  public override wire(): void {
    // Variables Assignment
    const entries = Object.entries(this.config);
    this.settings.css.altImgUrl = `url(${window.TMG_MEDIA_ALT_IMG_SRC})`;
    // Blackbox Handlers
    this.ctlr.config.get("*", (val, { target: { key, path } }: any) => (!path.startsWith("settings.css.") || banRgx.test(path) ? val : ((this._cache[key] ??= val = this.get(key)), val)), { signal: this.signal }); // #BLACKBOX: immediacy requirement
    this.ctlr.config.watch("*", (val, { target: { key, path } }: any) => path.startsWith("settings.css.") && !banRgx.test(path) && this.set(key, val), { signal: this.signal }); // #BLACKBOX: immediacy requirement
    // ---- Media Watchers
    this.media.watch("status.videoWidth", this.syncAspectRatio, { init: true, signal: this.signal });
    this.media.watch("status.videoHeight", this.syncAspectRatio, { signal: this.signal });
    // ---- State --------
    this.ctlr.state.watch("dimensions.container.width", (w) => (this.settings.css.currentContainerWidth = `${w || 0}px`), { signal: this.signal });
    this.ctlr.state.watch("dimensions.container.height", (h) => (this.settings.css.currentContainerHeight = `${h || 0}px`), { signal: this.signal });
    this.ctlr.state.watch("dimensions.object.width", (w) => (this.settings.css.currentObjectWidth = `${w || 0}px`), { signal: this.signal });
    this.ctlr.state.watch("dimensions.object.height", (h) => (this.settings.css.currentObjectHeight = `${h || 0}px`), { signal: this.signal });
    this.ctlr.state.watch("dimensions.object.top", (t) => (this.settings.css.currentObjectTop = `${t || 0}px`), { signal: this.signal });
    this.ctlr.state.watch("dimensions.object.left", (l) => (this.settings.css.currentObjectLeft = `${l || 0}px`), { signal: this.signal });
    // ---- Media Listeners
    this.media.on("status.loadedMetadata", this.handleLoadedMetadataStatus, { init: this.ctlr.payload.wired, signal: this.signal });
    // ---- State ----------
    this.ctlr.state.on("dimensions.container.tier", ({ value: tier }) => (this.media.container.dataset.sizeTier = tier || ""), { init: true, signal: this.signal });
    this.ctlr.state.on("dimensions.pseudoContainer.tier", ({ value: tier }) => (this.media.pseudoContainer.dataset.sizeTier = tier || ""), { init: true, signal: this.signal });
    // Post Wiring
    for (const [k, v] of entries) k !== "syncWithMedia" && ((this._cache[k] ??= this.config[k]), this.set(k, v));
    super.wire();
  }

  protected async handleLoadedMetadataStatus({ value }: REvent<CtlrMedia, "status.loadedMetadata">): Promise<void> {
    const color = value && (await this.ctlr.plug("settings.frame")?.getMainColor());
    for (const k of Object.keys(this.settings.css.syncWithMedia).filter((k) => this.settings.css.syncWithMedia[k])) this.settings.css[k] = String((value ? color : null) ?? this._cache[k]);
  }

  public getCSSKey(key: string): { isClass: boolean; id: string } {
    return { isClass: this.classKeys.includes(key), id: `tmg-media-${uncamelize(key, "-")}` };
  }
  protected getCSSValue(id: string): string {
    return getComputedStyle(this.media.container).getPropertyValue(`--${id}`) || "";
  }
  protected getClassValue(id: string): string {
    return Array.prototype.find.call(this.media.container.classList, (c) => c.startsWith(id))?.replace(`${id}-`, "") || "";
  }

  protected setCssVariable(id: string, value: any): void {
    const strVal = value != null ? String(value) : "";
    for (const el of [this.media.container, this.media.pseudoContainer]) el?.style.setProperty(`--${id}`, strVal); // "" auto-removes
  }
  protected setClassValue(id: string, value: any): void {
    for (const c of this.media.container.classList) c.startsWith(id) && this.media.container.classList.remove(c);
    value != null && value !== "" && this.media.container.classList.add(`${id}-${String(value)}`); // "" removes
  }

  protected get(key: string): string | number | undefined {
    const { isClass, id } = this.getCSSKey(key);
    return this[isClass ? "getClassValue" : "getCSSValue"](id);
  }
  protected set(key: string, value: any): void {
    const { isClass, id } = this.getCSSKey(key);
    this[isClass ? "setClassValue" : "setCssVariable"](id, value);
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
