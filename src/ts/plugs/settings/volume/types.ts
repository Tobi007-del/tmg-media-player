import { OptRange } from "@defs/generics";
import { SliderState } from "@plugs/base/slider";

export interface VolumeConfig extends OptRange {
  factor: number;
}

export interface VolumeState extends SliderState {
  audioSetup: boolean;
}
