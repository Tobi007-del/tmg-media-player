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
  actions: Record<string, Action>;
  logicPathBlacklist: string[];
  noPlugList: "*" | Array<keyof PlugRegistryMap>; // for non-core plugs
  mediaType: MediaType;
  mediaPlayer: string; // external media player courtesy, e.g. youtube, vimeo, etc.
  debug: boolean;
  devMode: boolean;
  disabled: boolean;
  cloneOnDetach: boolean; // stateful issues, src resets - freezing, etc.
}

// Use Deep Partial Util where applicable
