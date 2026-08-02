import { PosterPreview } from "@defs/generics";
import { Control } from "../../settings/controlPanel";

export interface LightStateConfig {
  disabled: boolean;
  controls: Control[] | boolean;
  preview: PosterPreview;
}
