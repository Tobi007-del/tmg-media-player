import { BasePlug } from "../../base";
import type { Persist } from "./types";
import { CtlrConfig } from "@defs/config";
import { PERSIST_BUILD } from "./build";
import { type REvent } from "sia-reactor";
import { fanout } from "sia-reactor/utils";
import { PersistModule } from "sia-reactor/modules";

export class PersistPlug extends BasePlug<Persist> {
  public static readonly plugName = "persist";
  public static readonly BUILD = PERSIST_BUILD;
  public module!: PersistModule<any>;

  public override mount(): void {
    // Variables Assignment
    this.module = new PersistModule({ key: `${this.ctlr.config.id}_STORE`, ...(this.config as Partial<Persist>) });
    // Utility Injection
    this.module.attach(this.media, "media").setup(this.ctlr.config, "config");
  }

  public override wire(): void {
    // Ctlr Config Listeners
    this.ctlr.config.on("settings.persist", this.handle, { signal: this.signal, init: false, depth: 1 });
  }

  protected handle(e: REvent<CtlrConfig, "settings.persist", 1>): void {
    e.type === "update" ? (this.module.config[e.target.key] = e.value as never) : fanout<Persist>(this.module.config, e.value); // module's config is non-volatile
  }

  protected override onDestroy(): void {
    this.module.destroy();
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
    persist: Persist;
  }
}
