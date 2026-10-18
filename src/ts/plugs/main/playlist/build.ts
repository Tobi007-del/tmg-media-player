import { DeepPartial } from "sia-reactor";
import { PlaylistConfig, PlayItemConfig } from "./types";
import { MEDIA_ITEM_BUILD } from "@consts/media";
import { TIME_TRAVEL_BUILD } from "@plugs/settings/timeTravel/build";

export const PLAYLIST_ITEM_FORMATTED: unique symbol = Symbol.for("TMG_MEDIA_PLAYLIST_ITEM_FORMATTED");

export const PLAYLIST_BUILD: DeepPartial<PlaylistConfig> = {
  allowOverride: {
    add: false,
    edit: false,
    move: true,
    remove: false,
  },
  content: null,
};

TIME_TRAVEL_BUILD.module.whitelist.config.push("playlist.content");

export const PLAYLIST_ITEM_BUILD: DeepPartial<PlayItemConfig> = {
  media: MEDIA_ITEM_BUILD as any,
  settings: {
    time: {
      min: 0,
      max: undefined,
      start: 0,
      end: undefined,
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
