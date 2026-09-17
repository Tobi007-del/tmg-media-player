import { CtlrConfig } from "@defs/config";
import type { Inert } from "sia-reactor";

export interface PlayItemConfig extends Pick<Required<CtlrConfig>, "media" | "settings" | "ads"> {}

export type PlaylistConfig = {
  content: Inert<PlayItemConfig[]> | null;
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
