import { TemporalConsoleConfig } from "sia-reactor/adapters/vanilla";
import { TemporalConfig as ReactorTemporalConfig } from "sia-reactor/modules";

export interface TemporalConfig {
  module: ReactorTemporalConfig<any>;
  console: TemporalConsoleConfig & { disabled: boolean };
  persist: boolean;
}

