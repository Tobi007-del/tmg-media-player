import { DeepPartial } from "sia-reactor";
import { PlaylistConfig, PlayItemConfig } from "./types";
import { MEDIA_ITEM_BUILD } from "@consts/media";

export const PLAYLIST_BUILD: DeepPartial<PlaylistConfig> = {
  allowOverride: {
    add: true,
    delete: true,
    move: true,
    edit: true,
  },
  content: null,
};

export const PLAY_ITEM_BUILD: DeepPartial<PlayItemConfig> = {
  media: MEDIA_ITEM_BUILD as any,
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
  ads: {
    rolls: [],
  },
}; // for a playlist
