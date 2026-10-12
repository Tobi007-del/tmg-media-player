import { Action } from "@defs/action";
import { BaseComponent } from ".";
import { Controller } from "@core/controller";

export interface ComponentConstructor<T extends BaseComponent = BaseComponent> {
  new (ctlr: Controller, config?: any, state?: any): T;
  componentName: string;
  isControl?: boolean;
}

export interface ComponentState {
  label: string;
  cmd: string;
  cmdKey: Action["id"];
  active: boolean;
  hidden: boolean;
  disabled: boolean;
}
