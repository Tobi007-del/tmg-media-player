import { OptRange } from "@defs/generics";
import { TimeFormat, TimeMode } from "@utils/time";

export interface TimeConfig extends OptRange {
  mode: TimeMode;
  format: TimeFormat;
  start?: number | null;
  end?: number | null;
  autoCap: number;
  whitelist: string[];
}
