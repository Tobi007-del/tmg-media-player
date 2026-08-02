import { BasePlug } from "../../base";
import type { PosterConfig, PosterState } from "./types";
import { POSTER_BUILD } from "./build";
import type { Controller } from "@core/controller";
import type { CtlrMedia } from "@defs/contract";
import type { REvent } from "sia-reactor";
import { silence } from "sia-reactor/modules";
import { createEl } from "@utils/dom";

export class PosterPlug extends BasePlug<PosterConfig, PosterState> {
  public static readonly plugName = "poster";
  public static readonly BUILD = POSTER_BUILD;
  public element!: HTMLImageElement;

  constructor(ctlr: Controller, config?: any) {
    super(ctlr, config, { visible: true });
  }

  public override mount(): void {
    // Variables Assignment
    this.element = this.ctlr.syncImgLoadState(createEl("img", { className: "tmg-media-poster tmg-media-filtered tmg-media-object", alt: "Poster Image" }));
    // DOM Injection
    this.ctlr.DOM.controlsContainer?.prepend(this.element);
  }
  public override unmount(): void {
    this.element.remove();
  }

  public override wire(): void {
    // State Listeners
    this.state.on("visible", this.syncView, { signal: this.signal });
    // Ctlr Media Watchers
    this.media.watch("tech", () => ((this.media.features.poster ||= true), this.syncView()), { init: true, signal: this.signal });
    // --------- Listeners
    this.media.on("type", this.syncView, { signal: this.signal });
    this.media.on("intent.poster", this.handlePosterIntent, { capture: true, init: this.ctlr.payload.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    this.media.on("intent.src", (e) => e.resolved && this.syncState(true), { signal: this.signal });
    this.media.on("state.paused", ({ value }) => !value && !this.config.strict && this.syncState(false), { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("state.currentTime", () => (this.config.strict || this.media.state.currentTime) && this.syncState(false), { init: this.ctlr.payload.wired, signal: this.signal }); // if strict, sets hides like html5, lightState Plug blocks
    this.media.on("status.ended", this.syncView, { signal: this.signal });
    this.media.on("state.poster", ({ value }) => ((this.element.dataset.loaded = "false"), value ? (this.element.src = value) : this.element.removeAttribute("src")), { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("status.loadedMetadata", this.autoGenerate, { init: this.ctlr.payload.wired, signal: this.signal });
    // Post Wiring
    super.wire();
  }

  protected handlePosterIntent(e: REvent<CtlrMedia, "intent.poster">): void {
    if (e.resolved) return;
    if (e.value) (this.element.dataset.loaded = "false"), (this.element.src = e.value); // start the load
    this.media.state.poster = e.value;
    e.resolve(this.name), this.syncView();
  }

  protected syncView(): void {
    if (this.media.type === "audio") this.media.state.poster ||= window.TMG_MEDIA_ALT_IMG_SRC || "";
    this.media.container.classList.toggle("tmg-media-poster-shown", this.syncState());
  }
  protected syncState(bool = this.state.visible): boolean {
    return (this.state.visible = bool || this.media.type === "audio" || (!this.config.strict && this.media.status.ended));
  }

  public async autoGenerate(): Promise<void> {
    const url = this.media.state.poster;
    if (!this.config.autoGenerate || !this.ctlr.isNativeEl || this.media.type === "audio" || (url && !url.endsWith(this.config.autoGenHash))) return;
    const frame = this.ctlr.isNativeEl && (await this.ctlr.plug("settings.frame")?.extract("", this.ctlr.config.lightState.preview.time));
    silence(() => (this.media.intent.poster = frame?.url ? `${frame.url}${this.config.autoGenHash}` : "")), url && URL.revokeObjectURL(url.replace(this.config.autoGenHash, ""));
  }
}

export type * from "./types";
export * from "./build";

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.poster": typeof PosterPlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    poster: PosterConfig;
  }
}
