import type { CtlrConfig, CtlrState } from "@defs/config";
import { CTX, type DeepPartial } from "sia-reactor";
import { ACTIONS_ENTRIES } from "./actions";

export const CONFIG_BUILD: DeepPartial<CtlrConfig> = {
  actions: {
    entries: ACTIONS_ENTRIES,
    devlist: [
      /^media\.intent\.(preload|crossOrigin|controls|controlsList)/,
      /^media\.settings\.(defaultMuted|defaultPlaybackRate|flushKeys)/,
      /^settings\.(techOrder|persist|css|panel|errors|ambience|objectFit|volume|brightness|playbackRate)/,
      /^settings\.keys\.(rankedMatch|overrides|blocks|moddedlist)/,
      /^settings\.timeTravel\.(console|module)/,
      "settings.modes.pictureInPicture.floatingPlayer.css",
      /\.(whitelist|blacklist|min|max|skip|start|end)($|\.)/, // Safe because nodes (like volume) are already blocked above
    ],
    blacklist: [
      /^media\.(state|status|tech|features|type|element|pseudoElement|container|pseudoContainer)/, // no-go area
      /^media\.intent\.(sources|tracks|xrInputSource)/,
      /^media\.settings\.(srcObject|protection|metadata\.(artwork|chapterInfo))/,
      /^settings\.toasts\.reminders\.[^.]+\.(target|id)/,
      "settings.sleepTimer.target",
      /\.(on|before)[A-Z]\w+$/,
      /\.(options)($|\.)/,
    ],
  },
  settings: {
    techOrder: [
      //   "youtube", // 1. Black-box (Regex must catch these URLs instantly)
      //   "vimeo", // 2. Black-box (Regex must catch these URLs instantly)
      //   "shaka", // 3. THE APEX PREDATOR (Catches .mpd and .m3u8 first)
      //   "hls", // 4. Fallback (Catches .m3u8 ONLY if Shaka is disabled/fails)
      //   "dash", // 5. Fallback (Catches .mpd ONLY if Shaka is disabled/fails)
      //   "html5", // 6. The Native Floor (Catches raw .mp4, .webm, .mp3, etc.)
    ],
  },
  devMode: CTX.isDevEnv,
  courtesy: "TMG",
  noPlugList: ["settings.persist"], // dev: "settings.persist"
};

export const STATE_BUILD: CtlrState = {
  readyState: 0,
  mediaIntersecting: true,
  parentIntersecting: true,
  dimensions: {
    container: { width: 0, height: 0, tier: "x" },
    pseudoContainer: { width: 0, height: 0, tier: "x" },
    object: { width: 0, height: 0, top: 0, left: 0 },
    poster: { width: 0, height: 0, top: 0, left: 0 },
  },
  pseudoActive: false,
};
