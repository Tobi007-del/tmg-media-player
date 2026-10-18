import { TimeConfig } from "./types";

export const TIME_BUILD: Partial<TimeConfig> & { whitelist: string[] } = {
  min: 0,
  skip: 10,
  mode: "elapsed",
  format: "digital",
  autoCap: 0.25,
  whitelist: ["settings.time.min", "settings.time.max", "media.settings.minTimePlayed"],
};
