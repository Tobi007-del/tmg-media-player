import { TimeTravelConsoleConfig } from "sia-reactor/adapters/vanilla";
import { TimeTravelConfig as ReactorTimeTravelConfig } from "sia-reactor/modules";

export interface TimeTravelConfig {
  module: ReactorTimeTravelConfig<any>;
  overlay: TimeTravelConsoleConfig;
  persist: boolean;
}

