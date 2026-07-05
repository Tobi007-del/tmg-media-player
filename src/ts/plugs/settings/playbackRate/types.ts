import { OptRange } from "@defs/generics";
import type { UIOption } from "@defs/UIOptions";

export interface PlaybackRateConfig extends OptRange {
  options: UIOption<number>[];
}
