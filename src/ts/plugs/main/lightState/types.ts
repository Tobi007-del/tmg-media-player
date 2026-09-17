import { PosterPreview } from "@defs/generics";
import { Control } from "../../settings/controlPanel";

export interface LightStateConfig {
  disabled: boolean;
  preview: PosterPreview;
  controls: Control[] | boolean;
  stallControl: string;
}
