import { BasePlug } from "../../base";
import type { LightConfig } from "./types";
import { LIGHT_BUILD } from "./build";
import type { CtlrMedia, MediaState } from "@defs/contract";
import type { CtlrConfig } from "@defs/config";
import { Payload, TERMINATOR, type REvent } from "sia-reactor";
import { inBoolArrOpt, isDef } from "@utils/obj";
import { withMeta } from "sia-reactor/utils";
import { silence } from "sia-reactor/modules";

export class LightPlug extends BasePlug<LightConfig> {
  public static readonly plugName = "light";
  public static readonly isMain: boolean = true;
  public static readonly BUILD = LIGHT_BUILD;
  public cache: Partial<Pick<MediaState, CacheKey>> & { keys: typeof cacheKeys } = { keys: cacheKeys };
  protected shadow: Partial<Pick<MediaState, ShadowKey>> & { keys: typeof shadowKeys } = { keys: shadowKeys };
  protected hasStalled = false;

  public override wire(): void {
    // Ctlr Config Listeners
    this.ctlr.config.on("light.disabled", this.handleDisabled, { init: true, signal: this.signal });
    this.ctlr.config.on("light.preview", this.handlePreview, { signal: this.signal });
    for (const k of ["controls", "stallControl"] as const) this.ctlr.config.on(`light.${k}`, this.syncControls, { init: k === "controls", signal: this.signal });
    // Post Wiring
    super.wire();
  }

  protected handleDisabled({ value }: REvent<CtlrConfig, "light.disabled">): void {
    if (value) {
      for (const k of this.shadow.keys) this.media.noget(`state.${k}`, this.getMediaState), this.media.noset(`state.${k}`, this.mediaStateHook), this.media.off(`intent.${k}`, this.handleMediaIntent, { capture: true });
      this.ctlr.state.noset("readyState", this.readyStateHook), this.media.nowatch("state.paused", this.eject);
      this.ctlr.DOM.controlsContainer?.removeEventListener("click", this.handleClick);
      if (this.media.status.teasing) this.media.state.paused = this.media.status.teasing = false;
      for (const k of this.cache.keys) isDef(this.cache[k]) && silence(() => (this.media.intent[k] = this.cache[k] as never)); // restore cache
      this.media.container.classList.remove("tmg-media-light", "tmg-media-low-light");
      !this.ctlr.flags.wired && this.hasStalled && this.ctlr.setReadyState(2); // restoring order
    } else {
      (this.cache.currentTime = this.cache.muted = undefined), (this.config.preview.tease = this.config.preview.tease); // force trigger
      this.media.container.classList.add("tmg-media-light");
      for (const k of this.shadow.keys) this.media.get(`state.${k}`, this.getMediaState, { signal: this.signal }), this.media.set(`state.${k}`, this.mediaStateHook, { signal: this.signal }), this.media.on(`intent.${k}`, this.handleMediaIntent, { capture: true, signal: this.signal }); // #VIRTUAL: reliable return value // #DICTATOR: reliable authority // #ISOLATION: peak compromise
      this.ctlr.state.set("readyState", this.readyStateHook, { signal: this.signal }); // #DICTATOR: reliable authority
      this.media.watch("state.paused", this.eject, { signal: this.signal });
      this.ctlr.DOM.controlsContainer?.addEventListener("click", this.handleClick, { signal: this.signal });
    }
  }

  protected getMediaState(v: any, { target: { key } }: Payload<CtlrMedia, `state.${ShadowKey}`>): any {
    return key === "paused" ? true : this.cache[key] ?? v;
  }
  protected mediaStateHook(v: any, _: boolean, { target: { key } }: Payload<CtlrMedia, `state.${ShadowKey}`>): boolean | number | typeof TERMINATOR {
    if (key !== "currentTime") return v === this.shadow[key] && (key !== "paused" || !this.media.state.autoplay) ? TERMINATOR : v;
    const teasing = this.config.preview.tease && this.media.status.teasing;
    teasing && v >= this.config.preview.max && lighten(() => (this.config.preview.loop ? (this.media.intent.currentTime = this.shadow.currentTime = this.config.preview.min) : (this.media.intent.paused = this.shadow.paused = true)));
    return teasing || v === this.shadow.currentTime ? TERMINATOR : v;
  }
  protected readyStateHook(v: number): number | typeof TERMINATOR {
    return v === 2 ? ((this.hasStalled = true), TERMINATOR) : v;
  }

  protected handleMediaIntent(e: REvent<CtlrMedia, `intent.${ShadowKey}`>): void {
    if (e.target.key === "paused") return void (!e.resolved && !e.light && (!e.value ? this.eject() : e.resolve(this.name)));
    if (e.resolved || e.light) return;
    this.cache[e.target.key] = e.value as any;
    e.resolve(this.name); // tech will get it later, no fear
  }

  protected handlePreview(e: REvent<CtlrConfig, "light.preview">): void {
    this.preview() && !this.media.status.duration && this.ctlr.when("duration", e, this.preview, this.signal); // in case start/end is a percentage
  }

  protected handleClick({ target }: MouseEvent): void {
    if (target === this.ctlr.DOM.controlsContainer) this.media.intent.paused = false;
  }

  protected preview(): boolean {
    const tease = (this.media.status.teasing = !this.config.disabled && (!this.config.preview.usePoster || !this.media.state.poster));
    if (!tease) return tease;
    for (const k of this.cache.keys) this.cache[k] ??= this.media[this.ctlr.gospel][k] as any;
    return lighten(() => ((this.media.intent.currentTime = this.shadow.currentTime = this.config.preview[this.config.preview.tease ? "min" : "max"]), this.config.preview.tease && ((this.media.intent.muted = this.shadow.muted = true), (this.media.intent.paused = this.shadow.paused = false)))), tease;
  }

  protected eject(): void {
    if (!this.config.disabled) this.stall(), (this.config.disabled = true), this.ctlr.config.tick("light.disabled");
  }
  protected stall(btn = inBoolArrOpt(this.config.controls, this.config.stallControl) ? this.ctlr.plug("settings.controlPanel")?.compEl(this.config.stallControl) : null): void {
    this.ctlr.plug("settings.overlay")?.show(), btn && this.media.container.classList.add("tmg-media-stall");
    btn?.addEventListener("animationend", () => this.media.container.classList.remove("tmg-media-stall"), { once: true, signal: this.signal });
  }

  protected syncControls(): void {
    this.media.container.classList.toggle("tmg-media-low-light", this.config.controls !== true);
    for (const c of this.ctlr.queryDOM("[data-control-id]", true)) {
      c.dataset.lightControl = String(inBoolArrOpt(this.config.controls, c.dataset.controlId!));
      c.dataset.stallControl = String(c.dataset.controlId === this.config.stallControl);
    }
  }
} // Pushed S.I.A to its limits, Call me the "Dictator".

const cacheKeys = ["muted", "currentTime"] as const,
  shadowKeys = ["paused", "muted", "currentTime"] as const,
  lighten = <T>(fn: () => T, bool = true): T => withMeta({ light: bool, silent: true }, fn);

type CacheKey = (typeof cacheKeys)[number];
type ShadowKey = (typeof shadowKeys)[number];

export type * from "./types";
export * from "./build";

declare module "@defs/registries" {
  interface PlugRegistryMap {
    light: typeof LightPlug;
  }
}

declare module "@defs/config" {
  interface CtlrConfig {
    light: LightConfig;
  }
}

declare module "@defs/contract" {
  interface MediaStatus {
    teasing?: boolean;
  }
}

declare module "sia-reactor" {
  interface ReactorMeta {
    light?: boolean;
    silent?: boolean; // incase timeTravel ain't augmented
  }
}
