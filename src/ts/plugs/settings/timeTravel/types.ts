import { TimeTravelConsoleConfig } from "sia-reactor/adapters/vanilla";
import { TimeTravelConfig } from "sia-reactor/modules";

export interface TimeTravel {
  module: TimeTravelConfig<any>;
  overlay: TimeTravelConsoleConfig;
  persist: boolean;
}
