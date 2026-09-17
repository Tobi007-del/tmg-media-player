import { Controller } from "./controller";
import { type Reactive, reactive } from "sia-reactor";
import { nuke } from "sia-reactor/utils";
import { isObj } from "@utils/obj";
import { isFunc, guardAllMethods } from "@t007/utils";

// --- CONTROLLABLE (The Orchestrated) ---
export abstract class Controllable<Config = any, State = any> {
  protected ac = new AbortController();
  public signal = this.ac.signal;
  public readonly ctlr: Controller;
  public readonly media: Controller["media"];
  public readonly state!: State extends object ? Reactive<State> : State; // for reactivity needs of those who pass it up
  public config: Config; // may be a reactive obj node or the obj itself
  public get settings() {
    return this.ctlr.settings; // can change ref
  } // for easy reach, better devx

  constructor(ctlr: Controller, config: Config, state?: State) {
    guardAllMethods(this, ctlr.guard);
    this.signal = AbortSignal.any([this.signal, ctlr.signal]);
    this.ctlr = ctlr;
    this.media = ctlr.media; // can't change ref
    this.state = (isObj(state) ? reactive(state) : state) as Controllable["state"];
    this.config = config;
  }

  public setup(): this {
    return this.onSetup(), this; // We let the subclass do its work
  }
  protected abstract onSetup(): void;

  public destroy(): void {
    !this.signal.aborted && this.ac.abort(`[TMG Controllable] Instance annihilation`); // ctlr may have aborted
    this.onDestroy(), (this.state as any)?.destroy?.(), this.config !== this.media && isFunc((this.config as any)?.destroy) && (this.config as any)?.destroy?.(); // Can I clean here?... Anatoly :)
    nuke(this);
  }
  protected onDestroy(): void {}

  public hibernate(): void {
    if (!this.signal.aborted) this.ac.abort(`[TMG Controllable] Instance hibernation`), this.onHibernate?.();
  }
  protected onHibernate?(): void {}

  public awaken(): void {
    if (this.signal.aborted) (this.signal = AbortSignal.any([(this.ac = new AbortController()).signal, this.ctlr.signal])), this.onAwaken?.();
  }
  protected onAwaken?(): void {} // e.g. this.wire()...
} // Try to use methods for most things so they can be customized when extended and also auto guarded
