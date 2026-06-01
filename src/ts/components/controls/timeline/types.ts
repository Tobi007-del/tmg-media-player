import { RangeInputConfig } from "../../rangeinput";

export interface TimelineConfig extends RangeInputConfig {
  previews:
    | boolean
    | {
        address?: string;
        cols?: number;
        rows?: number;
        spf?: number;
      };
}
