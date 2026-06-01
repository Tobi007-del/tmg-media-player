import { DeepPartial } from "sia-reactor";
import { Media } from "./types";

export const MEDIA_BUILD: DeepPartial<Media> = {
  title: "",
  artist: "",
  profile: "",
  album: "",
  artwork: [],
  chapterInfo: [],
  links: {
    title: "",
    artist: "",
    profile: "",
  },
  autoGenerate: true,
};
