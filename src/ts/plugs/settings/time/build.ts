import { TimeConfig } from "./types";

export const TIME_BUILD: Partial<TimeConfig> = {
  min: 0,
  skip: 10,
  mode: "elapsed",
  format: "digital",
  autoCap: 0.25,
  whitelist: ["light.preview.min", "light.preview.max", "settings.time.min", "settings.time.max", "settings.auto.next.countdown"],
};
