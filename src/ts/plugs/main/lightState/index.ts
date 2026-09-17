import { BasePlug } from "../../base";
import type { LightStateConfig } from "./types";
import { LIGHT_STATE_BUILD } from "./build";
import type { CtlrMedia } from "@defs/contract";
import type { CtlrConfig } from "@defs/config";
import { TERMINATOR, type REvent } from "sia-reactor";
import { inBoolArrOpt, isDef } from "@utils/obj";
import { silence } from "sia-reactor/modules";

export class LightStatePlug extends BasePlug<LightStateConfig> {
  public static readonly plugName = "lightState";
  public static readonly isMain: boolean = true;
  public static readonly BUILD = LIGHT_STATE_BUILD;
  protected hasStalled = false;
  protected shadowTime?: number;

  public override wire(): void {
    // Ctlr Media Setters
    this.media.set("state.currentTime", (v) => (v === this.shadowTime && !this.config.disabled ? TERMINATOR : v), { signal: this.signal }); // #DICTATOR: reliable authority
    // ---- State -------
    this.ctlr.state.set("readyState", (v) => (v === 2 && !this.config.disabled ? ((this.hasStalled = true), TERMINATOR) : v), { signal: this.signal }); // #DICTATOR: reliable authority
    // ---- Media Listeners
    this.media.on("intent.currentTime", this.handleCurrentTimeIntent, { capture: true, signal: this.signal }); // #ISOLATION: peak compromise
    // ---- Config --------
    this.ctlr.config.on("lightState.disabled", this.handleDisabled, { init: true, signal: this.signal });
    this.ctlr.config.on("lightState.preview.usePoster", this.handlePreviewUsePoster, { signal: this.signal });
    this.ctlr.config.on("lightState.preview.time", this.preview, { signal: this.signal });
    this.ctlr.config.on("lightState.controls", this.syncControls, { init: true, signal: this.signal });
    this.ctlr.config.on("lightState.stallControl", this.syncControls, { signal: this.signal });
    // Post Wiring
    super.wire();
  }

  protected handleCurrentTimeIntent(e: REvent<CtlrMedia, "intent.currentTime">): void {
    if (e.resolved || this.config.disabled || e.value === this.shadowTime) return;
    this.actualTime = e.value;
    e.resolve(this.name); // tech will get it later, no fear
  }

  protected handleDisabled({ value }: REvent<CtlrConfig, "lightState.disabled">): void {
    if (value) {
      if (isDef(this.actualTime)) this.media.intent.currentTime = this.actualTime!;
      this.media.container.classList.remove("tmg-media-light");
      this.media.nowatch("state.paused", this.eject);
      this.ctlr.DOM.controlsContainer?.removeEventListener("click", this.handleClick);
      !this.ctlr.flags.wired && this.hasStalled && this.ctlr.setReadyState(2); // restoring order
    } else {
      this.actualTime = undefined;
      this.config.preview.usePoster = this.config.preview.usePoster;
      this.media.container.classList.add("tmg-media-light");
      this.media.watch("state.paused", this.eject, { signal: this.signal });
      this.ctlr.DOM.controlsContainer?.addEventListener("click", this.handleClick, { signal: this.signal });
    }
  }

  protected handlePreviewUsePoster(e: REvent<CtlrConfig, "lightState.preview.usePoster">): void {
    this.preview() && !this.media.status.loadedMetadata && this.ctlr.when("loadedMetadata", e, this.preview, this.signal); // in case time is a percentage
  }

  protected handleClick({ target }: MouseEvent): void {
    target === this.ctlr.DOM.controlsContainer && this.eject();
  }

  protected preview(): boolean {
    if (this.config.disabled || (this.config.preview.usePoster && this.media.state.poster)) return false;
    this.actualTime ??= this.media[this.ctlr.gospel].currentTime;
    return silence(() => (this.media.intent.currentTime = this.shadowTime = this.config.preview.time!)), true;
  }
  private actualTime?: number;

  protected eject(): void {
    this.config.disabled = true;
    inBoolArrOpt(this.config.controls, this.config.stallControl) && this.stall();
    this.media.intent.paused = false;
  }

  protected stall(btn = this.ctlr.plug("settings.controlPanel")?.compEl(this.config.stallControl)): void {
    this.ctlr.plug("settings.overlay")?.show(), btn && this.media.container.classList.add("tmg-media-stall");
    btn?.addEventListener("animationend", () => this.media.container.classList.remove("tmg-media-stall"), { once: true, signal: this.signal });
  }

  protected syncControls(): void {
    for (const c of this.ctlr.queryDOM("[data-control-id]", true)) {
      c.dataset.lightControl = String(inBoolArrOpt(this.config.controls, c.dataset.controlId!));
      c.dataset.stallControl = String(c.dataset.controlId === this.config.stallControl);
    }
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
