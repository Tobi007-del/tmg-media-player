import { AptAutoplayOption, PosterPreview } from "@defs/generics";

export interface Auto {
  play: boolean | AptAutoplayOption;
  pause: boolean | AptAutoplayOption;
  next: {
    value: number; // -1 for false
    preview: PosterPreview;
  };
}
