import { CtlrConfig } from "@defs/config";

export interface PlaylistItemConfig extends Pick<CtlrConfig, "media" | "startup" | "settings"> {}

export type Playlist = PlaylistItemConfig[] | null;

export interface PlaylistState {
  currentIndex: number;
}
