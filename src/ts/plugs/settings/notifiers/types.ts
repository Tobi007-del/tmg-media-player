import { ComponentRegistryMap } from "@defs/registries";

export interface NotifiersConfig {
  disabled: boolean;
  whitelist: Array<keyof ComponentRegistryMap>;
  centerBlocks: string[];
}

export interface NotifiersState {
  events: string[];
}
