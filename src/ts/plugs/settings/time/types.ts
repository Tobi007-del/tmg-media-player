import { Paths } from "sia-reactor";
import { CtlrConfig } from "@defs/config";
import { OptRange } from "@defs/generics";
import { TimeFormat, TimeMode } from "@utils/time";

export interface TimeConfig extends OptRange {
  mode: TimeMode;
  format: TimeFormat;
  start: number | null | undefined;
  end: number;
  loop: boolean;
}

export interface TimeState {
  whitelist: Extract<Paths<CtlrConfig>, `${string}time${string}`>[];
}
