import { Auto } from ".";
import { DeepPartial } from "sia-reactor";

export const AUTO_BUILD: DeepPartial<Auto> = {
  next: {
    value: 20,
    preview: {
      usePoster: true,
      time: 4,
      tease: true,
    },
  },
};
