import { DeepPartial } from "sia-reactor";
import type { ObjectFitConfig } from "./types";

export const objectFits = ["contain", "cover", "fill"] as const;

export const OBJECT_FIT_BUILD: DeepPartial<ObjectFitConfig> = {
  options: [
    { value: "contain", display: "Crop to fit" },
    { value: "cover", display: "Fit to screen" },
    { value: "fill", display: "Stretch" },
  ]
};
