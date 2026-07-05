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
    // --------- Listeners
    this.media.on("intent.objectFit", this.handleObjectFitIntent, { capture: true, init: this.ctlr.payload.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    this.media.on("state.objectFit", this.handleObjectFitState, { init: this.ctlr.payload.wired, signal: this.signal });
    // ---- State ---------
    this.ctlr.state.on("dimensions.container.width", this.syncObjectSize, { init: true, signal: this.signal });
    this.ctlr.state.on("dimensions.container.height", this.syncObjectSize, { signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.css.objectFit", this.syncObjectSize, { signal: this.signal });
    this.ctlr.config.on("settings.css.objectPosition", this.syncObjectSize, { signal: this.signal });
    // Post Wiring
    this.ctlr.registerAction("objectFit", { fn: this.rotateFit, keyboard: { phase: "keydown" } }), super.wire();
  }

  protected handleObjectFitIntent(e: REvent<CtlrMedia, "intent.objectFit">): void {
    if (e.resolved) return;
    this.media.state.objectFit = e.value || "contain";
    e.resolve(this.name);
  }

  protected handleObjectFitState({ value: fit }: REvent<CtlrMedia, "state.objectFit">): void {
    this.settings.css.objectFit = this.media.container.dataset.objectFit = fit;
    this.settings.css.bgObjectFit = fit === "fill" ? "100% 100%" : fit; // prolly only 2 ppl on dis planet nd AI know dis trick
  }

  public get nextFit(): ObjectFit {
    return ({ contain: "cover", cover: "fill", fill: "contain" } as const)[this.media.state.objectFit];
  }
  public rotateFit(): void {
    this.media.intent.objectFit = rotateAny(this.media.state.objectFit, parseUIOpts(this.config.options!) as ObjectFit[]);
    this.media.features.objectFit && this.ctlr.plug("settings.notifiers")?.notify(`objectfit${this.media.intent.objectFit}`); // must notify for visual aid
  }

  public toLabel(fit = this.media.state.objectFit): string {
    return getUIOpt(this.config.options, fit);
  }

  public syncObjectSize(): void {
    const { width = this.ctlr.state.dimensions.container.width, height = this.ctlr.state.dimensions.container.height, left, top } = getRenderedBox(this.media.status, this.ctlr.state.dimensions.container, this.settings.css as any); // just had to be u, video frame
    (this.settings.css.currentObjectHeight = height + "px"), (this.settings.css.currentObjectWidth = width + "px"), (this.settings.css.currentObjectTop = top + "px"), (this.settings.css.currentObjectLeft = left + "px");
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
