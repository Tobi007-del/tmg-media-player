import { ComponentRegistryMap } from "@defs/registries";

export interface NotifiersConfig {
  disabled: boolean;
  whitelist: Array<keyof ComponentRegistryMap>;
}

export interface NotifiersState {
  events: string[];
}
