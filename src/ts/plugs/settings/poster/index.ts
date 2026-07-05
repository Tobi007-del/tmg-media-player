import { BasePlug } from "../../base";
import type { PosterConfig, PosterState } from "./types";
import { POSTER_BUILD } from "./build";
import type { Controller } from "@core/controller";
import type { CtlrMedia } from "@defs/contract";
import type { REvent } from "sia-reactor";
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
    this.media.on("intent.poster", this.handlePosterIntent, { capture: true, init: this.ctlr.payload.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    this.media.on("intent.src", (e) => e.resolved && (this.state.visible = true), { signal: this.signal });
    this.media.on("state.paused", ({ value }) => !value && !this.config.strict && (this.state.visible = false), { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("state.currentTime", () => (this.config.strict || this.media.state.currentTime) && (this.state.visible = false), { init: this.ctlr.payload.wired, signal: this.signal }); // if strict, sets hides like html5, lightState Plug blocks
    this.media.on("status.ended", this.syncView, { signal: this.signal });
    this.media.on("state.poster", ({ value }) => (value ? (this.element.src = value) : this.element.removeAttribute("src")), { init: this.ctlr.payload.wired, signal: this.signal });
    // Post Wiring
    super.wire();
  }

  protected handlePosterIntent(e: REvent<CtlrMedia, "intent.poster">): void {
    if (e.resolved) return;
    if (e.value) this.element.src = e.value; // start the load
    this.media.state.poster = e.value;
    e.resolve(this.name);
  }

  protected syncView(): void {
    this.media.container.classList.toggle("tmg-media-poster-shown", this.media.type === "audio" || this.state.visible || (!this.config.strict && this.media.status.ended));
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
