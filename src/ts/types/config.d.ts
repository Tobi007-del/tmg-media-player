import type { MediaType } from "./generics";
import type { MediaReport } from "./contract";
import type { Action } from "./actions";
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
    logicBlacklist: string[];
  };
  noPlugList: "*" | Array<keyof PlugRegistryMap>; // for non-core plugs
  mediaPlayer: string; // external media player courtesy, e.g. youtube, vimeo, etc.
  debug: boolean;
  devMode: boolean;
  disabled: boolean;
  cloneOnDetach: boolean; // stateful issues, src resets - freezing, etc.
}

// Use Deep Partial Util where applicable
