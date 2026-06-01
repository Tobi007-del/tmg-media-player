import { Paths } from "sia-reactor";
import type { TimelineConfig } from "@components/controls/timeline/types";
import { CtlrConfig } from "@defs/config";
import { OptRange } from "@defs/generics";

export interface CTime extends OptRange {
  mode: "elapsed" | "remaining";
  format: "digital" | "human" | "human-long";
  start: number | null | undefined;
  end: number;
  loop: boolean;
}

export interface TimeState {
  guardedPaths: Extract<Paths<CtlrConfig>, `${string}time${string}`>[];
}
