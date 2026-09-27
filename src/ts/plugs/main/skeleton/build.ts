import { SkeletonConfig } from "./types";

export const SKELETON_BUILD: Partial<SkeletonConfig> = {
  exclusivePlay: {
    value: true,
    options: [
      { value: true, display: "On" },
      { value: "video", display: "Videos" },
      { value: "audio", display: "Audios" },
      { value: false, display: "Off" },
    ],
  },
};
