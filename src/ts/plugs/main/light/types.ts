import { PosterPreview } from "@defs/generics";
import { Control } from "../../settings/controlPanel";

export interface LightConfig {
  disabled: boolean;
  preview: PosterPreview;
  controls: Control[] | boolean;
  stallControl: string;
}
