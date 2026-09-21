import { PosterPreview } from "@defs/generics";
import { APT_AUTOPLAY_OPTIONS } from "./build";
import { UISettings } from "@defs/UIOptions";
import { ToastOptions } from "@t007/toast";

export type AptAutoplayOption = (typeof APT_AUTOPLAY_OPTIONS)[number];

export interface AutoConfig {
  play: UISettings<boolean | AptAutoplayOption[], boolean | AptAutoplayOption>;
  pause: UISettings<boolean | AptAutoplayOption[], boolean | AptAutoplayOption>;
  next: {
    value: number; // -1 for false
    preview: PosterPreview;
    toast: ToastOptions;
  };
}
