import { PosterConfig } from "./types";

export const POSTER_BUILD: Partial<PosterConfig> = {
  eager: false,
  autoGen: {
    disabled: false,
    hash: "#tmg-auto-gen-poster",
  },
};
