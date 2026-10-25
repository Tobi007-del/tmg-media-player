import { DeepPartial } from "sia-reactor";
import { OptRange } from "@defs/generics";
import { UISettings, UIOption } from "@defs/UIOptions";

export interface CueRegion {
  id: string;
  width: number;
  lines: number;
  viewportAnchorX: number;
  viewportAnchorY: number;
  scroll: string;
  fluid: boolean; // #MONKEY: responsive sizing, true = maxWidth, false = width
}

export type CueLike = (TextTrackCue | { text: string }) &
  DeepPartial<{
    id: string;
    text: string;
    align: string;
    region: CueRegion;
    position: number | "auto";
    positionAlign: string;
    line: number | string;
    lineAlign: string;
    snapToLines: boolean;
    size: number;
    vertical: "" | "lr" | "rl";
    scroll: string; // #MONKEY
    fluid: boolean; // #MONKEY
  }>;

export interface CaptionsConfig {
  multiple: boolean;
  font: {
    family: UISettings<string>;
    size: OptRange & {
      value: number;
      options: UIOption<number>[];
    };
    color: UISettings<string>;
    opacity: UISettings<number>;
    weight: UISettings<string | number>;
    variant: UISettings<string>;
  };
  background: {
    color: UISettings<string>;
    opacity: UISettings<number>;
  };
  window: {
    color: UISettings<string>;
    opacity: UISettings<number>;
    position: {
      lockToVideo: boolean;
      lockToPanel: boolean;
    };
  };
  textAlignment: UISettings<"start" | "center" | "end">;
  characterEdgeStyle: UISettings<"none" | "raised" | "depressed" | "outline" | "drop-shadow">;
  allowMediaOverride: boolean;
  previewTimeout: number;
}

export interface CaptionsState {
  snubbingCurrentTextTrack: boolean;
}
