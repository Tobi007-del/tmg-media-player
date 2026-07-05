import { objectFits } from "./build";
import type { UIOption } from "@defs/UIOptions";

export type ObjectFit = (typeof objectFits)[number];

export interface ObjectFitConfig {
  options?: UIOption<ObjectFit>[];
}
