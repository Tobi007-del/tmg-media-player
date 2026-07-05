import { RangeInputConfig } from "../../rangeinput";

declare module "../../rangeinput/types" {
  interface RangeInputChunk {
    buffer?: HTMLElement;
  }
}

export interface TimelineConfig extends RangeInputConfig {
  previews:
    | boolean
    | {
        address?: string;
        cols?: number;
        rows?: number;
        spf?: number;
      };
  compact: boolean;
  autopause: boolean;
  bufferMarks: boolean;
  playedMarks: boolean;
}
