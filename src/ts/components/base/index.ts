import { REvent } from "sia-reactor";
import { Controllable } from "@core/controllable";
import { Controller } from "@core/controller";
import { parseForARIAKS } from "@utils/keys";
import { CtlrMedia, MediaFeatures } from "@defs/contract";
import { ComponentConstructor, ComponentState } from "./types";

export abstract class BaseComponent<Config = any, State extends ComponentState = any, El extends HTMLElement = HTMLElement> extends Controllable<Config, State> {
  public static readonly componentName: string;
  public static readonly isControl: boolean = false;
  public get name() {
    return (this.constructor as ComponentConstructor).componentName;
  }
  public element!: El;
  public get el() {
    return this.element;
  }

  constructor(ctlr: Controller, config: Config, state?: State) {
    super(ctlr, config, { label: "", cmd: "", active: false, disabled: false, hidden: false, keyShortcut: "", voiceCommand: "", ...state } as State);
  }
  protected override onSetup(): void {
    this.mount?.();
    this.ctlr.state.readyState ? this.wire?.() : this.wire && this.ctlr.state.wonce("readyState", this.wire, { signal: this.signal }); // wire after all plugs setup
  }
  protected override onDestroy(): void {
    this.unmount();
  }

  public abstract create(): El; // Must assign to this.element before returning
  public mount?(): void {}
  public unmount(): void {
    this.el.remove();
  }
  public wire?(): void {} // auto unwiring

  public active() {
    this.el.classList.toggle("tmg-media-control-active", (this.state.active = true));
  }
  public inactive() {
    this.el.classList.toggle("tmg-media-control-active", (this.state.active = false));
  }
  public disable(): void {
    this.el.classList.toggle("tmg-media-control-disabled", (this.state.disabled = true));
  }
  public enable(): void {
    this.el.classList.toggle("tmg-media-control-disabled", (this.state.disabled = false));
  }
  public hide(): void {
    this.el.classList.toggle("tmg-media-control-hidden", (this.state.hidden = true));
  }
  public show(): void {
    this.el.classList.toggle("tmg-media-control-hidden", (this.state.hidden = false));
  }
  protected gate(e: REvent<CtlrMedia, `features.${keyof MediaFeatures}`>): void {
    !e.value ? this.hide() : this.canShow && this.show();
  }
  protected get canShow(): boolean {
    return true;
  } // override to make gating smarter

  public setBadge(val: string): void {
    val ? (this.el.dataset.badge = val) : delete this.el.dataset.badge;
  }
  protected setBtnARIA(dblAction?: string, target: HTMLElement = this.el): void {
    this.state.label && target.setAttribute("aria-label", this.state.label);
    this.state.keyShortcut && target.setAttribute("aria-keyShortcuts", parseForARIAKS(this.state.keyShortcut, false));
    if (dblAction) target.setAttribute("aria-description", `Double-press to ${dblAction}`);
    else target.hasAttribute("aria-description") && target.removeAttribute("aria-description");
  }
}

export type * from "./types";
