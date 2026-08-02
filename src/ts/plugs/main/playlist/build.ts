import { DeepPartial } from "sia-reactor";
import { PlaylistConfig, PlaylistItemConfig } from "./types";

export const PLAYLIST_BUILD: DeepPartial<PlaylistConfig> = {
  allowOverride: {
    add: true,
    delete: true,
    move: true,
    edit: true,
  },
  content: null,
};

export const PLAYLIST_ITEM_BUILD: DeepPartial<PlaylistItemConfig> = {
  media: {
    intent: {
      src: "",
      poster: "",
      tracks: [],
    },
    status: {},
    settings: {
      metadata: {
        title: "",
        artist: "",
        profile: "",
        artwork: [],
        chapterInfo: [],
        links: {
          title: "",
          artist: "",
          profile: "",
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
