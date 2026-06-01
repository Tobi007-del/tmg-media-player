import { BasePlug } from "../../base";
import { ERROR_MESSAGES_BUILD } from "./build";
import type { ErrorMessages } from "./types";
import type { REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";
import type { ErrorCode } from "@defs/generics";

export class ErrorMessagesPlug extends BasePlug<ErrorMessages> {
  public static readonly plugName = "errorMessages";
  public static readonly BUILD = ERROR_MESSAGES_BUILD;

  public override wire(): void {
    // Ctlr Media Listeners
    this.media.on("status.error", this.handleErrorStatus, { init: this.ctlr.payload.wired, signal: this.signal });
  }

  protected async handleErrorStatus({ value }: REvent<CtlrMedia, "status.error">): Promise<void> {
    if (!value) return this.ctlr.plug("disabled")?.reactivate(); // In case it was a transient error that got resolved, we can try reactivating the UI
    const mssg = this.config[(value.code as ErrorCode) ?? 5] || value.message || `An unknown error occurred with the ${this.media.type} :(`;
    if (this.ctlr.state.readyState < 3) return this.ctlr.plug("disabled")?.deactivate(mssg);
    if (t007.dialog?.isActive(`${this.ctlr.config.id}-error-dialog`)) return; // Prevent spamming dialogs\
    const res = await t007.confirm(mssg, { id: `${this.ctlr.config.id}-error-dialog`, rootElement: this.ctlr.DOM.containerContent, confirmText: "Try Again", cancelText: "Dismiss" });
    if (res === true) {
      const time = this.media.state.currentTime;
      this.media.element.load(), (this.media.intent.currentTime = time), (this.media.intent.paused = false);
    } else if (res !== "recovered") this.ctlr.plug("disabled")?.deactivate(mssg);
  }
}

export type * from "./types";
export * from "./build";

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.errorMessages": typeof ErrorMessagesPlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    errorMessages: ErrorMessages;
  }
}
