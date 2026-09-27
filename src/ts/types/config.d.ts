import type { MediaReport } from "./contract";
import type { Action } from "./action";
import type { Dimensions } from "./generics";
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
    devlist: Array<string | RegExp>;
    blacklist: Array<string | RegExp>;
  };
  devMode: boolean;
  disabled: boolean;
  courtesy: string; // media player courtesy, e.g. YouTube, Vimeo, etc.
  safeDetach: boolean; // detach issues, e.g src reset -> freezing, etc.
  noPlugList: "*" | Array<keyof PlugRegistryMap>; // for non-core plugs
} // Use Deep Partial Util where applicable

export interface CtlrState {
  readyState: number;
  mediaIntersecting: boolean;
  parentIntersecting: boolean;
  dimensions: {
    container: Dimensions & { tier: string };
    pseudoContainer: Dimensions & { tier: string };
    object: Dimensions & { top: number; left: number };
    poster: Dimensions & { top: number; left: number };
  };
  pseudoActive: boolean;
  frameReadyPromise?: Promise<null> | null;
}
