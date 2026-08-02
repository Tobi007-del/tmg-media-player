import { TimeTravelConsoleConfig } from "sia-reactor/adapters/vanilla";
import { TimeTravelConfig as ReactorTimeTravelConfig } from "sia-reactor/modules";

export interface TimeTravelConfig {
  module: ReactorTimeTravelConfig<any>;
  console: TimeTravelConsoleConfig & { disabled: boolean };
  persist: boolean;
}

