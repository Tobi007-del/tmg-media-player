import { Controller } from "@core/controller";
import { BasePlug, BasePin } from ".";
import type { PlugRegistryMap, PinRegistryMap } from "@defs/registries";

export interface PlugConstructor<T extends BasePlug = BasePlug> {
  new (ctlr: Controller, config?: any): T;
  plugName: string;
  isCore: boolean;
  isMain: boolean;
  BUILD?: any;
  surname: "" | "settings.";
  fullName: keyof PlugRegistryMap;
}

export interface PinConstructor<T extends BasePin = BasePin, PC extends PlugConstructor = PlugConstructor> {
  new (ctlr: Controller, config: any): T;
  pinName: string;
  Plug: PC;
  BUILD?: any;
  surname: string;
  fullName: keyof PinRegistryMap;
}
