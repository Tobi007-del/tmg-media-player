import { BasePlug } from "../../base";
import type { LightStateConfig } from "./types";
import { LIGHT_STATE_BUILD } from "./build";
import type { CtlrMedia } from "@defs/contract";
import type { CtlrConfig } from "@defs/config";
import { TERMINATOR, type REvent } from "sia-reactor";
import { inBoolArrOpt } from "@utils/obj";
import { silence } from "sia-reactor/modules";

export class LightStatePlug extends BasePlug<LightStateConfig> {
  public static readonly plugName = "lightState";
  public static readonly isMain: boolean = true;
  public static readonly BUILD = LIGHT_STATE_BUILD;
  protected hasStalled = false;
  protected shadowTime?: number;

  public override wire(): void {
    // Ctlr State Setters
    this.ctlr.state.set("readyState", (v) => (v === 2 && !this.config.disabled ? ((this.hasStalled = true), TERMINATOR) : v), { signal: this.signal }); // #DICTATOR: reliable authority
    // ---- Media Listeners
    this.media.on("intent.currentTime", this.handleCurrentTimeIntent, { capture: true, signal: this.signal }); // #ISOLATION: peak compromise
    // ---- Config Listeners
    this.ctlr.config.on("lightState.disabled", this.handleDisabled, { init: true, signal: this.signal });
    this.ctlr.config.on("lightState.controls", this.handleControls, { init: true, signal: this.signal });
    this.ctlr.config.on("lightState.preview.usePoster", this.handleUsePoster, { signal: this.signal });
    this.ctlr.config.on("lightState.preview.time", this.handleTime, { signal: this.signal });
    // Post Wiring
    super.wire();
  }

  protected handleCurrentTimeIntent(e: REvent<CtlrMedia, "intent.currentTime">): void {
    if (e.resolved || this.config.disabled) return;
    if (e.value !== this.shadowTime) e.resolve(this.name); // tech will get it later, no fear
  }

  protected handleDisabled({ value }: REvent<CtlrConfig, "lightState.disabled">): void {
    if (value) {
      if (this.settings.time.start != null) this.media.intent.currentTime = this.settings.time.start;
      this.media.container.classList.remove("tmg-media-light");
      this.media.nowatch("state.paused", this.remove);
      this.ctlr.DOM.controlsContainer?.removeEventListener("click", this.handleClick);
      !this.ctlr.payload.wired && this.hasStalled && this.ctlr.setReadyState(2); // restoring order
    } else {
      this.config.preview.usePoster = this.config.preview.usePoster;
      this.media.container.classList.add("tmg-media-light");
      this.media.watch("state.paused", this.remove, { signal: this.signal });
      this.ctlr.DOM.controlsContainer?.addEventListener("click", this.handleClick, { signal: this.signal });
    }
  }

  protected handleControls(): void {
    for (const c of this.ctlr.queryDOM("[data-control-id]", true)) c.dataset.lightControl = this.isLight(c.dataset.controlId!) ? "true" : "false";
  }

  protected handleUsePoster({ target: { value, object } }: REvent<CtlrConfig, "lightState.preview.usePoster">): void {
    if (this.config.disabled || (value && this.media.state.poster)) return;
    silence(() => (this.media.intent.currentTime = this.shadowTime = object.time));
    if (!this.media.status.loadedMetadata) this.media.once("status.loadedMetadata", () => (this.config.preview.usePoster = value), { signal: this.signal }); // retrigger when metadata is ready in case time is a percentage
  }

  protected handleTime({ target: { object } }: REvent<CtlrConfig, "lightState.preview.time">): void {
    !this.config.disabled && (!object.usePoster || !this.media.state.poster) && silence(() => (this.media.intent.currentTime = this.shadowTime = object.time!));
  }

  protected handleClick({ target }: MouseEvent): void {
    target === this.ctlr.DOM.controlsContainer && this.remove();
  }

  protected add(): void {
    this.config.disabled = false;
  }
  protected remove(): void {
    this.config.disabled = true;
    this.isLight("bigplaypause") && this.stall();
    this.media.intent.paused = false;
  }

  protected stall(): void {
    this.ctlr.plug("settings.overlay")?.show();
    const bigPlayBtn = this.ctlr.plug("settings.controlPanel")?.compEl("bigplaypause");
    bigPlayBtn && this.media.container.classList.add("tmg-media-stall");
    bigPlayBtn?.addEventListener("animationend", () => this.media.container.classList.remove("tmg-media-stall"), { once: true, signal: this.signal });
  }

  protected isLight(controlId: string): boolean {
    return inBoolArrOpt(this.config.controls, controlId);
  }
}

export type * from "./types";
export * from "./build";

declare module "@defs/registries" {
  interface PlugRegistryMap {
    lightState: typeof LightStatePlug;
  }
}

declare module "@defs/config" {
  interface CtlrConfig {
    lightState: LightStateConfig;
  }
}
