import type { MediaType } from "./generics";
import type { MediaReport } from "./contract";
import type { Action } from "./action";
import type { LightStateConfig } from "@plugs/main/lightState";
import type { PlaylistConfig } from "@plugs/main/playlist";
import type { TechRegistryMap, PlugRegistryMap } from "@defs/registries";

export interface Settings {
  techOrder: Array<keyof TechRegistryMap>;
}

export interface CtlrConfig {
  id: string;
  media?: MediaReport; // for startup only
  settings: Settings;
  actions: {
    entries: Record<string, Action>;
    blacklist: Array<string>;
  };
  devMode: boolean;
  disabled: boolean;
  courtesy: string; // media player courtesy, e.g. YouTube, Vimeo, etc.
  safeDetach: boolean; // detach issues, e.g src reset -> freezing, etc.
  noPlugList: "*" | Array<keyof PlugRegistryMap>; // for non-core plugs
} // Use Deep Partial Util where applicable
