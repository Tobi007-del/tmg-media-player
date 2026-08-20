import { BasePlug } from "../../base";
import { OBJECT_FIT_BUILD } from "./build";
import type { ObjectFitConfig, ObjectFit } from "./types";
import type { CtlrMedia } from "@defs/contract";
import type { REvent } from "sia-reactor";
import { rotateAny } from "@utils/num";
import { getUIOpt, parseUIOpts } from "@utils/obj";
import { getRenderedBox } from "@utils/media";

export class ObjectFitPlug extends BasePlug<ObjectFitConfig> {
  public static readonly plugName = "objectFit";
  public static readonly BUILD = OBJECT_FIT_BUILD;

  public override wire(): void {
    // Ctlr Media Watchers
    this.media.watch("tech", () => (this.media.features.objectFit ||= true), { init: true, signal: this.signal });
    this.media.watch("state.objectFit", this.onObjectFitState, { init: this.ctlr.payload.wired, signal: this.signal });
    // --------- Listeners
    this.media.on("intent.objectFit", this.handleObjectFitIntent, { capture: true, init: this.ctlr.payload.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    // ---- State ---------
    for (const p of ["width", "height"] as const) this.ctlr.state.watch(`dimensions.container.${p}`, this.syncSizes, { init: p === "width", signal: this.signal });
    // ---- Config --------
    this.ctlr.config.watch("settings.css.objectFit", this.syncSizes, { signal: this.signal });
    this.ctlr.config.watch("settings.css.objectPosition", this.syncSizes, { signal: this.signal });
    // Post Wiring
    this.ctlr.addAction("objectFit", { fn: this.rotateFit, keyboard: { phase: "keydown" } }, this.signal), super.wire();
  }

  protected handleObjectFitIntent(e: REvent<CtlrMedia, "intent.objectFit">): void {
    if (e.resolved) return;
    this.media.state.objectFit = e.value || "contain";
    e.resolve(this.name);
  }

  protected onObjectFitState(fit: ObjectFit): void {
    this.settings.css.objectFit = this.media.container.dataset.objectFit = fit;
    this.settings.css.bgObjectFit = fit === "fill" ? "100% 100%" : fit; // prolly only 2 ppl on dis planet nd AI know dis trick
  }

  public get nextFit(): ObjectFit {
    return ({ contain: "cover", cover: "fill", fill: "contain" } as const)[this.media.state.objectFit];
  }
  public rotateFit(): void {
    this.media.intent.objectFit = rotateAny(this.media.state.objectFit, parseUIOpts(this.config.options!) as ObjectFit[]);
    this.media.features.objectFit && this.ctlr.plug("settings.notifiers")?.notify(`objectFit${this.media.intent.objectFit}`); // must notify for visual aid
  }

  public toLabel(fit = this.media.state.objectFit): string {
    return getUIOpt(this.config.options, fit);
  }

  public syncSize(type: "object" | "poster" = "object", status: { videoWidth: number; videoHeight: number } = this.media.status): void {
    const { width = this.ctlr.state.dimensions.container.width, height = this.ctlr.state.dimensions.container.height, left = 0, top = 0 } = getRenderedBox(status, this.ctlr.state.dimensions.container, this.settings.css as any); // just had to be u, video frame
    (this.ctlr.state.dimensions[type].height = height + 1), (this.ctlr.state.dimensions[type].width = width + 1), (this.ctlr.state.dimensions[type].top = top), (this.ctlr.state.dimensions[type].left = left);
  }
  public syncPosterSize(): void {
    const { naturalWidth: videoWidth = this.media.status.videoWidth, naturalHeight: videoHeight = this.media.status.videoHeight } = this.ctlr.DOM.poster || {};
    this.syncSize("poster", { videoWidth, videoHeight });
  }
  public syncSizes(): void {
    this.syncSize(), this.syncPosterSize();
  }
}

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.objectFit": typeof ObjectFitPlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    objectFit: ObjectFitConfig;
  }
}

export type * from "./types";
export * from "./build";
