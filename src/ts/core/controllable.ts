import { Controller } from "./controller";
import { type Reactive, reactive } from "sia-reactor";
import { nuke } from "sia-reactor/utils";
import { guardAllMethods } from "@utils/methd";
import { isObj } from "@utils/obj";
import { isFunc } from "@t007/utils";

// A lifecylce controlled by it's Controller
// Try to use methods for most things so they can be customized when extended and also auto guarded
export abstract class Controllable<Config = any, State = any> {
  protected readonly ac = new AbortController();
  protected readonly signal = this.ac.signal;
  protected readonly guard: Controller["guard"];
  protected readonly media: Controller["media"];
  public readonly ctlr: Controller;
  public config: Config; // may be a reactive obj node or the obj itself
  public readonly state!: State extends object ? Reactive<State> : State; // for reactivity needs of those who pass it up

  constructor(ctlr: Controller, config: Config, state?: State) {
    guardAllMethods(this, ctlr.guard);
    this.signal = AbortSignal.any([this.signal, ctlr.signal]);
    this.guard = ctlr.guard;
    this.media = ctlr.media;
    this.ctlr = ctlr;
    this.config = config;
    this.state = (isObj(state) ? reactive(state) : state) as Controllable["state"];
  }

  public setup(): this {
    return this.onSetup(), this; // We let the subclass do its work
  }
  protected abstract onSetup(): void;

  public destroy(): void {
    !this.signal.aborted && this.ac.abort(`[TMG Controllable] Instance is being destroyed`); // incase controller already aborted, kills all listeners and timers before proper destruction below
    this.onDestroy(), (this.state as any)?.destroy?.(), isFunc((this.config as any)?.destroy) && (this.config as any)?.destroy?.(); // Can I clean here?... Anatoly :)
    nuke(this);
  }
  protected onDestroy(): void {}
}
