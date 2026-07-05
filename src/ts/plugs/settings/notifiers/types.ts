import { ComponentRegistryMap } from "@defs/registries";

export interface NotifiersConfig {
  disabled: boolean;
  list: Array<keyof ComponentRegistryMap>;
}

export interface NotifiersState {
  events: string[];
}
