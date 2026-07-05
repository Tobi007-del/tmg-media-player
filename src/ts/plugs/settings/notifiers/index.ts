import { BasePlug } from "../../base";
import type { NotifiersConfig, NotifiersState } from "./types";
import { NOTIFIERS_BUILD } from "./build";
import type { Controller } from "@core/controller";
import type { REvent } from "sia-reactor";
import { createEl } from "@utils/dom";
import { BaseNotifier } from "@components/notifiers/base";
import { ComponentRegistry } from "@core/registries";
import type { CtlrConfig } from "@defs/config";
import type { ComponentRegistryMap } from "@defs/registries";

export class NotifiersPlug extends BasePlug<NotifiersConfig, NotifiersState> {
  public static readonly plugName = "notifiers";
  public static readonly BUILD = NOTIFIERS_BUILD;
  public components = new Map<string, BaseNotifier>();
  public container!: HTMLDivElement;

  constructor(ctlr: Controller, config = ctlr.settings.notifiers) {
    super(ctlr, config, { events: [] }); // ["mediaplay", "mediapause", "mediaprev", "medianext", "playbackrateup", "playbackratedown", "volumeup", "volumedown", "volumemuted", "brightnessup", "brightnessdown", "brightnessdark", "objectfitcontain", "objectfitcover", "objectfitfill", "captions", "capture", "theater", "fullscreen", "fwd", "bwd"]
  }

  public override mount(): void {
    // Variables Assignment
    this.ctlr.DOM.notifiersContainer = this.container = createEl("div", { className: "tmg-media-notifiers-container" }, { notify: "" });
    // DOM Injection
    this.ctlr.DOM.controlsContainer?.prepend(this.container);
    // DOM -> Ctlr Config Listeners
    this.ctlr.config.on("settings.notifiers.list", this.handleList, { init: true, signal: this.signal });
  }
  public override unmount(): void {
    this.container.remove();
  }

  public override wire(): void {
    // State Listeners
    this.state.on("events", this.handleEventsState, { init: true, signal: this.signal });
    // Post Wiring
    super.wire();
  }

  protected handleEventsState({ currentTarget: { value: events = [] } }: REvent<NotifiersState, "events">): void {
    for (const eN of events) this.container.addEventListener(eN, this.handleEvent, { signal: this.signal });
  }

  protected handleList({ value: list = [] }: REvent<CtlrConfig, "settings.notifiers.list">): void {
    for (const id of list) !this.components.has(id) && this.initComp(id);
  }

  public initComp<K extends keyof ComponentRegistryMap>(name: K, comp?: InstanceType<ComponentRegistryMap[K]>): InstanceType<ComponentRegistryMap[K]> | undefined;
  public initComp<T extends BaseNotifier = BaseNotifier>(name: string, comp?: T): T | undefined;
  public initComp(name: string, comp = ComponentRegistry.init(name, this.ctlr)) {
    return comp ? (this.components.set(name, comp as BaseNotifier), comp) : undefined;
  }

  public comp<K extends keyof ComponentRegistryMap>(name: K): InstanceType<ComponentRegistryMap[K]> | undefined;
  public comp<T extends BaseNotifier = BaseNotifier>(name: string): T | undefined;
  public comp(name: string): BaseNotifier | undefined {
    return this.components.get(name);
  }
  public compEl<K extends keyof ComponentRegistryMap>(name: K): InstanceType<ComponentRegistryMap[K]>["element"] | undefined;
  public compEl<T extends BaseNotifier = BaseNotifier>(name: string): T["element"] | undefined;
  public compEl(name: string): HTMLElement | undefined {
    return this.components.get(name)?.element;
  }

  public handleEvent({ type: eN }: Event): void {
    this.reset(), this.ctlr.RAFLoop("notifying", () => this.reset(eN), this.signal);
  }

  public reset(token = "", flush = false): void {
    flush && this.ctlr.cancelRAFLoop("notifying");
    this.container.setAttribute("data-notify", token);
  }

  public notify(key: string): void {
    if (!this.config.disabled) this.ctlr.fire(key, null, this.container);
  }

  protected override onDestroy(): void {
    this.reset("", true);
    for (const comp of this.components.values()) comp.destroy();
    this.components.clear();
    this.ctlr.DOM.notifiersContainer = null;
    super.onDestroy();
  }
}

export type * from "./types";
export * from "./build";

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.notifiers": typeof NotifiersPlug;
  }
  interface ControllerDOMMap {
    notifiersContainer?: HTMLDivElement | null;
  }
}

declare module "@defs/config" {
  interface Settings {
    notifiers: NotifiersConfig;
  }
}
