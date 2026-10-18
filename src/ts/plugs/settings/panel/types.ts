import type { SettingsMenuConfig } from "./menu/types";

export interface PanelConfig {
  autoPause: boolean;
  menu: SettingsMenuConfig;
}

export interface PanelState {
  moreOpen: boolean;
}

export type * from "./menu/types";
