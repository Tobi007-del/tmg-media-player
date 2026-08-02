import { BasePlug } from "../../base";
import { ERRORS_BUILD } from "./build";
import type { ErrorsConfig } from "./types";
import type { REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";
import { silence } from "sia-reactor/modules";
import { TechConstructor } from "@techs/base";

export class ErrorsPlug extends BasePlug<ErrorsConfig> {
  public static readonly plugName = "errors";
  public static readonly BUILD = ERRORS_BUILD;

  public override wire(): void {
    // Ctlr Media Listeners
    this.media.on("status.error", this.handleErrorStatus, { init: this.ctlr.payload.wired, signal: this.signal });
    // Post Wiring
    this.ctlr.registerAction("reload", { fn: this.reloadTech }), super.wire();
  }

  protected async handleErrorStatus({ value }: REvent<CtlrMedia, "status.error">): Promise<void> {
    if (!value) return this.ctlr.plug("disabled")?.reactivate(); // In case it was a transient error that got resolved, we can try reactivating the UI
    this.ctlr.log(value, "error"); // no `.notice` since that's our job, no "swallow" since we breaking the player anyways
    let { code = 5, message = "" } = value;
    code = code > 5 ? (!message.includes(`${code}`) || this.config[code] ? code : 5) : code;
    message = this.config[code]?.replaceAll("media", this.media.type) || message || "";
    if (this.ctlr.state.readyState < 3) return this.ctlr.plug("disabled")?.deactivate(message); // #PATIENT: only after first play
    const id = `${this.ctlr.config.id}-error-dialog`;
    if (!t007.dialog?.isActive(id)) (await t007.confirm?.(message, { id, rootElement: this.ctlr.DOM.containerContent, confirmText: "Try Again", cancelText: "Dismiss" })) ? this.reloadTech() : this.ctlr.plug("disabled")?.deactivate(message);
  }

  public reloadTech(): void {
    this.ctlr.useTech(this.media.tech.constructor as TechConstructor, true), silence(() => (this.media.intent.paused = false));
  }
}

export type * from "./types";
export * from "./build";

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.errors": typeof ErrorsPlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    errors: ErrorsConfig;
  }
}
