import { CTX } from "sia-reactor";
import { PersistConfig } from "./types";

export const PERSIST_BUILD: Partial<PersistConfig> = {
  strict: !CTX.isDevEnv,
  whitelist: {
    config: ["light", "playlist", "settings", "actions", "devMode"],
    media: ["state", "settings"],
  },
  blacklist: {
    config: ["actions.blacklist", "actions.devlist"],
    media: ["state.sources", "state.tracks", "state.poster", "state.fullscreen", "state.pictureInPicture", "settings.srcObject"], // "state.src", "state.paused"
  },
  mirrorReads: true,
  mirrorWrites: true,
  cachePayload: true,
  clearConfirm: "CLEAR DATA",
};
