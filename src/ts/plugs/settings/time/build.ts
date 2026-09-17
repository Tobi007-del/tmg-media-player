import { TimeConfig } from "./types";

export const TIME_BUILD: Partial<TimeConfig> = {
  min: 0,
  skip: 10,
  mode: "elapsed",
  format: "digital",
  autoCap: 0.25,
  whitelist: ["lightState.preview.time", "settings.time.min", "settings.time.max", "settings.time.start", "settings.time.end", "settings.auto.next.preview.time"],
};
