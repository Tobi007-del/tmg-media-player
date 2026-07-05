import type { RangeInputConfig } from "./types";

export const RANGE_INPUT_BUILD: RangeInputConfig = {
  label: "Range Slider",
  min: 0,
  max: 100,
  value: 0,
  previewValue: 50,
  step: 1,
  scrub: {
    sync: true,
    relative: true,
    cancel: {
      delta: 5,
      timeout: 1500,
    },
  },
  wheel: {
    disabled: false,
    axisRatio: 6,
  },
  preview: true,
  tooltip: true,
  readonly: false,
  disabled: false,
  divs: [],
  marks: [],
};
