import { AptRange } from "@defs/generics";
import { ComponentState } from "../base";

export interface RangeInputDiv {
  value: number;
  label?: string;
}

export interface RangeInputMark {
  start: number;
  end?: number;
  label?: string;
  type?: string; // e.g., "chapter", "ad", "buffered", etc., for styling purposes. i.e. (`tmg-media-range-${type}-mark`)
}

export interface RangeInputChunk {
  label?: string;
  start: number;
  end: number;
  size: number;
  el: HTMLElement;
  base: HTMLElement;
  value: HTMLElement;
  preview: HTMLElement;
}

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
  formatTooltip?: (val: number) => string | number;
  readonly: boolean;
  disabled: boolean;
  divs: RangeInputDiv[];
  marks: RangeInputMark[];
}

export interface RangeState extends ComponentState {
  scrubbing: boolean;
  previewing: boolean;
  cancelScrub: boolean;
}
