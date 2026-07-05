import { BasePlug } from "../../base";
import { ERRORS_BUILD } from "./build";
import type { ErrorsConfig, ErrorCode } from "./types";
import type { REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";
import { transaction } from "sia-reactor/modules";

export class ErrorsPlug extends BasePlug<ErrorsConfig> {
  public static readonly plugName = "errors";
  public static readonly BUILD = ERRORS_BUILD;

  public override wire(): void {
    // Ctlr Media Listeners
    this.media.on("status.error", this.handleErrorStatus, { init: this.ctlr.payload.wired, signal: this.signal });
    // Post Wiring
    super.wire();
  }

  protected async handleErrorStatus({ value }: REvent<CtlrMedia, "status.error">): Promise<void> {
    if (!value) return this.ctlr.plug("disabled")?.reactivate(); // In case it was a transient error that got resolved, we can try reactivating the UI
    this.ctlr.log(value, "error"); // no `.notice` since that's our job, no "swallow" mod since we breaking the player anyways
    const mssg = this.config[(value.code as ErrorCode) ?? 5]?.replaceAll("media", this.media.type) || value.message || `An unknown error occurred with the ${this.media.type} :(`;
    if (this.ctlr.state.readyState < 3) return this.ctlr.plug("disabled")?.deactivate(mssg); // #PATIENT: only after first play
    if (t007.dialog?.isActive(`${this.ctlr.config.id}-error-dialog`)) return; // Prevent spamming dialogs\
    const res = await t007.confirm(mssg, { id: `${this.ctlr.config.id}-error-dialog`, rootElement: this.ctlr.DOM.containerContent, confirmText: "Try Again", cancelText: "Dismiss" });
    if (res === true) {
      const time = this.media.state.currentTime;
      transaction(() => (this.ctlr.isNativeEl && this.media.element.load(), (this.media.intent.currentTime = time), (this.media.intent.paused = false)), "Error Recovery");
    } else if (res !== "recovered") this.ctlr.plug("disabled")?.deactivate(mssg);
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
