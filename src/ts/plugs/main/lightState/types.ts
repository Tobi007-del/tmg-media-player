import { PosterPreview } from "@defs/generics";
import { Control, BigControl } from "../../settings/controlPanel";

export interface LightStateConfig {
  disabled: boolean;
  controls: (Control | BigControl)[] | boolean;
  preview: PosterPreview;
}
