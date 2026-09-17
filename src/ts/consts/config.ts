import type { CtlrConfig } from "@defs/config";
import { Action } from "@defs/action";
import { CTX, type DeepPartial } from "sia-reactor";
import { ACTIONS_BUILD } from "./actions";
import { AUDIO_CONTEXT, CtlrState } from "@tools/runtime";
import { queryFullscreen } from "@utils/dom";

export const CONFIG_BUILD: DeepPartial<CtlrConfig> = {
  actions: {
    entries: Object.fromEntries(Object.keys(ACTIONS_BUILD).map((k) => [k, { id: k, ...ACTIONS_BUILD[k as Action["id"]] }])) as any,
    blacklist: ["media.state", "media.status", "media.tech", "media.features", "media.type", "media.element", "media.pseudoElement", "media.container", "media.pseudoContainer", "media.intent.sources", "media.intent.tracks", "media.intent.xrInputSource", "media.settings.srcObject", "media.settings.protection", "media.settings.metadata.artwork", "media.settings.metadata.chapterInfo"],
  },
  settings: {
    // techOrder: [
    //   "youtube", // 1. Black-box (Regex must catch these URLs instantly)
    //   "vimeo", // 2. Black-box (Regex must catch these URLs instantly)
    //   "shaka", // 3. THE APEX PREDATOR (Catches .mpd and .m3u8 first)
    //   "hls", // 4. Fallback (Catches .m3u8 ONLY if Shaka is disabled/fails)
    //   "dash", // 5. Fallback (Catches .mpd ONLY if Shaka is disabled/fails)
    //   "html5", // 6. The Native Floor (Catches raw .mp4, .webm, .mp3, etc.)
    // ],
  },
  devMode: CTX.isDevEnv,
  courtesy: "TMG",
  noPlugList: [], // dev: "settings.persist"
};

export const STATE_BUILD = (): CtlrState => ({
  readyState: 0,
  audioCtxReady: !!AUDIO_CONTEXT,
  mediaIntersecting: true,
  parentIntersecting: true,
  dimensions: {
    container: { width: 0, height: 0, tier: "x" },
    pseudoContainer: { width: 0, height: 0, tier: "x" },
    window: { width: window.innerWidth, height: window.innerHeight },
    object: { width: 0, height: 0, top: 0, left: 0 },
    poster: { width: 0, height: 0, top: 0, left: 0 },
  },
  screenOrientation: { type: screen.orientation?.type ?? "", angle: screen.orientation?.angle ?? 0, locked: false },
  docVisibilityState: document.visibilityState,
  docInFullscreen: queryFullscreen(),
  pseudoActive: false,
});
