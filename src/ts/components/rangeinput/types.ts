import { AptRange } from "@defs/generics";
import { ComponentState } from "../base";

export interface RangeInputConfig extends AptRange {
  value: number;
  previewValue: number;
  label: string;
  scrub: {
    sync: boolean;
    relative: boolean;
    cancel: {
      delta: number;
      timeout: number;
    };
  };
  wheel: {
    disabled: boolean;
    axisRatio: number;
  };
  preview: boolean;
  tooltip: boolean;
}

export interface RangeState extends ComponentState {
  scrubbing: boolean;
  shouldCancelScrub: boolean;
}
