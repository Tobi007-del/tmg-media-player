import { CtlrConfig } from "@defs/config";

export interface PlaylistItemConfig extends Pick<Required<CtlrConfig>, "media" | "settings"> {}

export type PlaylistConfig = {
  content: PlaylistItemConfig[] | null;
  allowOverride: {
    add: boolean;
    delete: boolean;
    move: boolean;
    edit: boolean;
  };
};

export interface PlaylistState {
  sortOrder: "asc" | "desc";
}
