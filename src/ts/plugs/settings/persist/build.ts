import { Persist } from "./types";

export const PERSIST_BUILD: Partial<Persist> = {
  whitelist: {
    config: ["lightState", "settings"],
    media: ["state", "settings"],
  },
  blacklist: {
    media: ["state.src", "state.sources", "state.tracks", "state.srcObject", "state.poster", "state.fullscreen", "state.pictureInPicture"], // "state.paused"
  },
  mirrorWriteTo: true,
};
