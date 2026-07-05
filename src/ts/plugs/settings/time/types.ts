import { Paths } from "sia-reactor";
import { CtlrConfig } from "@defs/config";
import { OptRange } from "@defs/generics";

export interface TimeConfig extends OptRange {
  mode: "elapsed" | "remaining";
  format: "digital" | "human" | "human-long";
  start: number | null | undefined;
  end: number;
  loop: boolean;
}

export interface TimeState {
  whitelist: Extract<Paths<CtlrConfig>, `${string}time${string}`>[];
}
