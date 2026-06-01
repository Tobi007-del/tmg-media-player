import { DeepPartial } from "sia-reactor";
import { Playlist, PlaylistItemConfig } from "./types";

export const PLAYLIST_BUILD: DeepPartial<Playlist> = null;

export const PLAYLIST_ITEM_BUILD: DeepPartial<PlaylistItemConfig> = {
  media: {
    title: "",
    chapterInfo: [],
    links: {
      title: "",
    },
  },
  startup: {
    intent: {
      src: "",
      tracks: [],
    },
  },
  settings: {
    time: {
      start: 0,
    },
    controlPanel: {
      timeline: {
        previews: false,
      },
    },
  },
}; // for a playlist
