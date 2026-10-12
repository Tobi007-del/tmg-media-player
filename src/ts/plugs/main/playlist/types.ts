import { CtlrConfig } from "@defs/config";
import type { Inert } from "sia-reactor";

export interface PlayItemConfig extends Pick<Required<CtlrConfig>, "media" | "settings" | "ads"> {}

export type PlaylistConfig = {
  content: Inert<PlayItemConfig[]> | null;
  allowOverride:
    | boolean
    | {
        add: boolean;
        edit: boolean;
        move: boolean;
        remove: boolean;
      };
};

export interface PlaylistState {
  sortOrder: "asc" | "desc";
}
