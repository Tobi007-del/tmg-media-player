import { PosterPreview } from "@defs/generics";
import { Control, BigControl } from "../../settings/controlPanel";

export interface LightState {
  disabled: boolean;
  controls: (Control | BigControl)[] | boolean;
  preview: PosterPreview;
}
