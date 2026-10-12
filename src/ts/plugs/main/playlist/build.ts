import { DeepPartial } from "sia-reactor";
import { PlaylistConfig, PlayItemConfig } from "./types";
import { MEDIA_ITEM_BUILD } from "@consts/media";

export const PLAYLIST_BUILD: DeepPartial<PlaylistConfig> = {
  allowOverride: {
    add: false,
    edit: false,
    move: true,
    remove: false,
  },
  content: null,
};

export const PLAY_ITEM_BUILD: DeepPartial<PlayItemConfig> = {
  media: MEDIA_ITEM_BUILD as any,
  settings: {
    time: {
      min: 0,
      max: undefined,
      start: 0,
      end: undefined,
    },
    captions: {
      secondaryTracks: [],
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
