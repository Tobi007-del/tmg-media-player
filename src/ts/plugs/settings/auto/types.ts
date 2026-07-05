import { PosterPreview } from "@defs/generics";
import { APT_AUTOPLAY_OPTIONS } from "./build";
import { UISettings } from "@defs/UIOptions";

export type AptAutoplayOption = (typeof APT_AUTOPLAY_OPTIONS)[number];

export interface AutoConfig {
  play: UISettings<boolean | AptAutoplayOption>;
  pause: UISettings<boolean | AptAutoplayOption>;
  next: {
    value: number; // -1 for false
    preview: PosterPreview;
  };
}
