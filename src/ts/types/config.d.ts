import type { MediaType } from "./generics";
import type { MediaReport } from "./contract";
import type { LightState } from "@plugs/main/lightState";
import type { Media } from "@plugs/main/media";
import type { Playlist } from "@plugs/main/playlist";
import type { TechRegistryMap, PlugRegistryMap } from "@defs/registries";

export interface Settings {
  techOrder: Array<keyof TechRegistryMap>;
}

export interface CtlrConfig {
  id: string;
  startup: Pick<MediaReport, "intent" | "settings">;
  settings: Settings;
  noPlugList: Array<keyof PlugRegistryMap>; // for non-core plugs
  mediaType: MediaType;
  mediaPlayer: string; // external media player courtesy, e.g. youtube, vimeo, etc.
  debug: boolean;
  disabled: boolean;
  cloneOnDetach: boolean; // stateful issues, src resets - freezing, etc.
}

// Use Deep Partial Util where applicable
