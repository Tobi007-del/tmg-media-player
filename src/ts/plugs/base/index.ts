import { Controllable } from "@core/controllable";
import type { Controller } from "@core/controller";
import { PlugConstructor as PC, PinConstructor as PIC } from "./types";
import type { PlugRegistryMap, PinRegistryMap, MenuRegistryMap } from "@defs/registries";
import { getPath } from "sia-reactor/utils";
import { MenuRegistry } from "@core/registries";

export abstract class BasePlug<Config = any, State = any> extends Controllable<Config, State> {
  public static readonly plugName: string;
  public static readonly isCore: boolean = false;
  public static readonly isMain: boolean = false;
  public static readonly BUILD: any;
  public static get surname() {
    return this.isMain ? "" : "settings.";
  }
  public static get fullName() {
    return (this.surname + this.plugName) as keyof PlugRegistryMap;
  }
  public get name() {
    return (this.constructor as PC).plugName;
  }

  constructor(ctlr: Controller, config: Config | undefined = getPath(ctlr.config as any, new.target.fullName), state?: State) {
    ctlr.plug(new.target.fullName)?.destroy();
    super(ctlr, config, state);
    const path = new.target.fullName as any;
    this.ctlr.config.watch(path, () => (this.config = getPath(this.ctlr.config, path)), { signal: this.signal }); // #COMPUTED: config can lose reference
    ctlr.plugs.set(new.target.fullName, this);
  }

  protected override onSetup(): void {
    this.mount?.();
    this.ctlr.state.readyState ? this.wire?.() : this.wire && this.ctlr.state.wonce("readyState", this.wire, { signal: this.signal }); // wire after all plugs setup
  }
  protected override onDestroy(): void {
    this.unmount?.();
    this.ctlr.plugs.delete((this.constructor as PC).fullName);
  }

  public mount?(): void {}
  public unmount?(): void {}
  public wire(): void {
    this.registerMenu();
  }

  protected registerMenu(): void {
    this.ctlr.plug("settings.settingsView")?.menu.register(MenuRegistry.get((this.constructor as PC).fullName as keyof MenuRegistryMap)?.(this as any));
  } // override to configure positioning
}

export abstract class BasePin<Plug extends BasePlug = BasePlug, Config = any, State = any> extends Controllable<Config, State> {
  public static readonly pinName: string;
  public static readonly Plug: PC;
  public static readonly BUILD: any;
  public static get surname() {
    return this.Plug.plugName;
  }
  public static get fullName() {
    return `${this.surname}.${this.pinName}` as keyof PinRegistryMap;
  }
  public get name() {
    return (this.constructor as PIC).Plug.fullName;
  }
  public get plug(): Plug {
    return this.ctlr.plug<Plug>((this.constructor as PIC).Plug.fullName)!; // `!`: only plug will instantiate after all
  }

  constructor(ctlr: Controller, config: Config, state?: State) {
    super(ctlr, config, state);
    const path: any = `${new.target.Plug.fullName}.${new.target.pinName}`;
    this.ctlr.config.watch(path, () => (this.config = getPath(this.ctlr.config, path)), { signal: this.signal }); // #COMPUTED: config can lose reference
  }

  protected override onSetup(): void {} // plug handles mount and wire
  protected override onDestroy(): void {
    this.unmount?.();
  }

  public mount?(): void {}
  public unmount?(): void {}
  public wire?(): void {}
}

export type * from "./types";
