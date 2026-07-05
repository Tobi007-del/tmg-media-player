import { BasePlug } from "../../base";
import type { PersistConfig } from "./types";
import { PERSIST_BUILD } from "./build";
import { fanout } from "sia-reactor/utils";
import { PersistModule } from "sia-reactor/modules";

export class PersistPlug extends BasePlug<PersistConfig> {
  public static readonly plugName = "persist";
  public static readonly BUILD = PERSIST_BUILD;
  public module!: PersistModule<any>;

  public override mount(): void {
    // Variables Assignment
    this.module = new PersistModule({ key: `${this.ctlr.config.id}_STORE`, ...(this.config as Partial<PersistConfig>) });
    // Utility Injection
    this.module.attach(this.media, "media").setup(this.ctlr.config, "config");
  }

  public override wire(): void {
    // Ctlr Config Listeners
    this.ctlr.config.on("settings.persist", (e) => fanout<PersistConfig>(this.module.config, e.currentTarget.value), { depth: 1, signal: this.signal, init: false }); // #STABLE: snubs unchanged writes
    // Post Wiring
    this.module.clearCache(), super.wire();
  }

  protected override onDestroy(): void {
    this.module.destroy(), super.onDestroy();
  }
}

export type * from "./types";
export * from "./build";

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.persist": typeof PersistPlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    persist: PersistConfig;
  }
}
