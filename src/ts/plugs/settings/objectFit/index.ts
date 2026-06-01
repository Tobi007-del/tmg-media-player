import { BasePlug } from "../../base";
import { OBJECT_FIT_BUILD, objectFits } from "./build";
import type { ObjectFit } from "./types";
import type { CtlrMedia } from "@defs/contract";
import type { REvent } from "sia-reactor";
import { rotateAny } from "@utils/num";

export class ObjectFitPlug extends BasePlug<ObjectFit> {
  public static readonly plugName = "objectFit";
  public static readonly BUILD = OBJECT_FIT_BUILD;

  public override wire(): void {
    // Ctlr Config Watchers
    this.ctlr.config.watch("settings.objectFit", this.forwardObjectFit, { init: "auto", signal: this.signal });
    // ---- Media Listeners
    this.media.on("tech", () => (this.media.features.objectFit ||= this.ctlr.isNativeTech), { init: true, signal: this.signal });
    this.media.on("intent.objectFit", this.handleObjectFitIntent, { capture: true, init: this.ctlr.payload.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    this.media.on("state.objectFit", this.handleObjectFitState, { init: this.ctlr.payload.wired, signal: this.signal });
    // Post Wiring
    this.ctlr.plug("settings.keys")?.register("objectFit", this.rotateFit, { phase: "keydown" });
  }

  protected forwardObjectFit(value: ObjectFit): void {
    this.media.intent.objectFit = value;
  }

  protected handleObjectFitIntent(e: REvent<CtlrMedia, "intent.objectFit">): void {
    if (e.resolved || !this.ctlr.isNativeTech) return;
    this.media.state.objectFit = this.ctlr.settings.css.objectFit = e.value || "contain";
    e.resolve(this.name);
  }

  protected handleObjectFitState({ value: fit }: REvent<CtlrMedia, "state.objectFit">): void {
    this.media.container.dataset.objectFit = fit;
    this.ctlr.settings.css.bgSafeObjectFit = fit === "fill" ? "contain" : fit;
  }

  public get nextFit(): ObjectFit {
    return ({ contain: "cover", cover: "fill", fill: "contain" } as const)[this.media.state.objectFit];
  }
  public rotateFit(): void {
    this.media.intent.objectFit = rotateAny(this.media.state.objectFit, objectFits);
    this.ctlr.plug("settings.notifiers")?.notify(`objectfit${this.media.intent.objectFit}`); // must notify for visual aid
  }

  public toLabel(fit = this.media.state.objectFit): string {
    return { contain: "Crop to fit", cover: "Fit to screen", fill: "Stretch" }[fit];
  }
}

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.objectFit": typeof ObjectFitPlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    objectFit: ObjectFit;
  }
}

export type * from "./types";
export * from "./build";
