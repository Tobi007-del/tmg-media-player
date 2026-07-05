import { DeepPartial } from "sia-reactor";
import { PlaylistConfig, PlaylistItemConfig } from "./types";

export const PLAYLIST_BUILD: DeepPartial<PlaylistConfig> = {
  allowOverride: { add: true, delete: true, move: true },
  content: null,
};

export const PLAYLIST_ITEM_BUILD: DeepPartial<PlaylistItemConfig> = {
  media: {
    intent: {
      src: "",
      tracks: [],
    },
    settings: {
      metadata: {
        title: "",
        chapterInfo: [],
        links: {
          title: "",
        },
      },
    },
  },
  settings: {
    time: {
      start: 0,
    },
    controlPanel: {
      timeline: {
        previews: false,
        marks: [],
      },
    },
  },
}; // for a playlist
