import { UISettings } from "@defs/UIOptions";

export interface SkeletonConfig {
  exclusivePlay: UISettings<boolean | "audio" | "video">;
}
