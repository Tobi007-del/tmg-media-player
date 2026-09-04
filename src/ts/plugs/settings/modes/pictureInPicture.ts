import { BasePin } from "../../base";
import { ModesPlug } from "./index";
import type { ModesPictureInPictureConfig } from "./types";
import { MODES_PICTURE_IN_PICTURE_BUILD } from "./build";
import type { REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";
import type { CtlrConfig } from "@defs/config";
import { handleDOMMutation } from "@tools/runtime";
import { createEl, loadResource, observeMutation, supportsPictureInPicture } from "@utils/dom";
import { mockAsync, breath } from "@utils/fn";
import { isStr } from "@utils/obj";
import { isSameURL } from "@utils/str";
import { PiPPlaceholder } from "@components/holders/pipPlaceholder";
import { ComponentRegistry } from "@core/registries";
import { silence } from "sia-reactor/modules";

export class ModesPictureInPicturePin extends BasePin<ModesPlug, ModesPictureInPictureConfig> {
  public static readonly pinName = "pictureInPicture";
  public static get Plug() {
    return ModesPlug;
  }
  public static readonly BUILD = MODES_PICTURE_IN_PICTURE_BUILD;
  public inFloatingPlayer = false; // a quick notice flag for external deps
  public floatingWindow: (Window & typeof globalThis) | null = null;
  protected placeholder: PiPPlaceholder | null = null;
  protected pseudoPlaceholder: PiPPlaceholder | null = null;
  public whitelist = { url: [] as string[], token: [":root", "tmg", "t007", "sia"] }; // #DEFAULT: build privilege
  public blacklist = { url: [] as string[], token: [] as string[] };

  public override mount(): void {
    // Utility Injection
    this.placeholder = ComponentRegistry.init("pipPlaceholder", this.ctlr);
    if ((window as any).documentPictureInPicture) this.pseudoPlaceholder = ComponentRegistry.init("pipPlaceholder", this.ctlr);
    this.placeholder?.mount(), this.pseudoPlaceholder && this.media.pseudoContainer.prepend(this.pseudoPlaceholder.el);
  }

  public override wire(): void {
    // Ctlr Media Watchers
    this.media.watch("tech", this.syncFeatures, { init: true, signal: this.signal });
    // ---- Media Listeners
    this.media.on("intent.pictureInPicture", this.handlePictureInPictureIntent, { capture: true, init: this.ctlr.payload.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    this.media.on("state.pictureInPicture", this.handlePictureInPictureState, { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("state.disablePictureInPicture", this.syncFeatures, { signal: this.signal });
    // ---- Config ------
    this.ctlr.config.on("settings.modes.pictureInPicture.disabled", this.handleDisabled, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.modes.pictureInPicture.floatingPlayer.disabled", this.handleDisabled, { signal: this.signal });
    // Post Wiring
    this.ctlr.learn("pictureInPicture", { keyboard: { phase: "keyup" } }, this.signal);
  }

  protected handleDisabled({ value }: REvent<CtlrConfig, "settings.modes.pictureInPicture.disabled" | "settings.modes.pictureInPicture.floatingPlayer.disabled">): void {
    this.syncFeatures();
    if (value && (this.ctlr.isUIActive("pictureInPicture") || this.ctlr.isUIActive("floatingPlayer"))) this.media.intent.pictureInPicture = false;
  }

  protected handlePictureInPictureIntent(e: REvent<CtlrMedia, "intent.pictureInPicture">): void {
    if (e.resolved) return;
    const pipActive = this.ctlr.isUIActive("pictureInPicture");
    if (!this.ctlr.isNativeEl && this.config.floatingPlayer.disabled) return e.reject(this.name);
    if (e.value && this.ctlr.plug("settings.modes")?.fullscreen?.inFullscreen) silence(() => (this.media.intent.fullscreen = false));
    if (!pipActive && this.media.features.floatingPlayer) {
      e.value ? !this.inFloatingPlayer && this.initFloatingPlayer() : this.inFloatingPlayer && this.floatingWindow?.close();
      e.resolve(this.name);
    } // tech will handle PiP toggle if not using floating player
  }

  protected async handlePictureInPictureState({ value }: REvent<CtlrMedia, "state.pictureInPicture">): Promise<void> {
    if (this.floatingWindow) return;
    if (value) {
      this.media.container.classList.add("tmg-media-picture-in-picture"), this.media.pseudoContainer.classList.add("tmg-media-in-picture-in-picture");
      this.ctlr.plug("settings.overlay")?.show();
      silence(() => (this.media.intent.miniplayer = false));
      this.ctlr.plug("settings.metadata")?.syncSession();
    } else {
      await mockAsync(180);
      this.media.container.classList.remove("tmg-media-picture-in-picture"), this.media.pseudoContainer.classList.remove("tmg-media-in-picture-in-picture");
      this.ctlr.plug("settings.modes")?.miniplayer?.toggle();
      this.ctlr.plug("settings.overlay")?.delay();
    }
  }

  protected async initFloatingPlayer(): Promise<void> {
    if (this.inFloatingPlayer) return;
    (window as any).documentPictureInPicture?.window?.close?.();
    silence(() => (this.media.intent.miniplayer = false));
    this.floatingWindow = await (window as any).documentPictureInPicture.requestWindow(this.config.floatingPlayer);
    this.inFloatingPlayer = true;
    this.floatingWindow!.document.documentElement.style.cssText = `height:100%; background:url(${this.media.settings.metadata.profile}) center / 32px no-repeat, url(${this.media.state.poster}) center / ${this.settings.css.bgObjectFit} no-repeat, black;`;
    await breath(this.floatingWindow!); // rendering style to keep UI visible during heavy lifting
    const cssTexts = [],
      hreflist = this.whitelist.url.concat([window.TMG_MEDIA_CSS_SRC, window.T007_TOAST_CSS_SRC, window.T007_INPUT_CSS_SRC, window.T007_DIALOG_CSS_SRC].filter((src) => (isStr(src) ? src : false)) as string[]); // CSS too experimental; needs a link (href) :)
    for (const sht of document.styleSheets) {
      try {
        if (!hreflist.some((s = "") => isSameURL(s, sht.href)) && !this.blacklist.url.some((s = "") => isSameURL(s, sht.href))) for (const { cssText: txt } of sht.cssRules) this.whitelist.token.some((t) => txt.includes(t)) && !this.blacklist.token.some((t) => txt.includes(t)) && cssTexts.push(txt);
      } catch {
        continue;
      }
    }
    this.floatingWindow!.document.head.append(createEl("style", { textContent: cssTexts.join("\n") }));
    await Promise.all(hreflist.map((href) => href.includes(".css") && loadResource(href, "style", undefined, this.floatingWindow!)));
    this.ctlr.plug("skeleton")?.enterPseudoMode();
    this.media.container.classList.add("tmg-media-floating-player", "tmg-media-progress-bar"), this.media.pseudoContainer.classList.add("tmg-media-in-floating-player");
    this.floatingWindow!.document.body.append(this.media.container);
    this.floatingWindow!.document.documentElement.id = document.documentElement.id;
    this.floatingWindow!.document.documentElement.className = document.documentElement.className;
    for (const attr of document.documentElement.getAttributeNames()) this.floatingWindow!.document.documentElement.setAttribute(attr, document.documentElement.getAttribute(attr)!);
    this.signal.addEventListener("abort", observeMutation(this.floatingWindow!.document.documentElement, handleDOMMutation, { childList: true, subtree: true }), { once: true });
    this.floatingWindow!.addEventListener("resize", this.handleFloatingPlayerResize, { signal: this.signal });
    this.floatingWindow!.addEventListener("pagehide", this.handleFloatingPlayerClose, { signal: this.signal });
    this.ctlr.plug("settings.keys")?.setEventListeners();
    this.media.state.pictureInPicture = true;
  } // #STANDALONE: needs scoped behavior

  protected handleFloatingPlayerResize(): void {
    if (!this.config.floatingPlayer.preferInitialWindowPlacement) (this.config.floatingPlayer.width = this.floatingWindow?.innerWidth ?? this.config.floatingPlayer.width), (this.config.floatingPlayer.height = this.floatingWindow?.innerHeight ?? this.config.floatingPlayer.height);
  }

  protected handleFloatingPlayerClose(): void {
    this.inFloatingPlayer = false;
    this.floatingWindow = null;
    this.media.container.classList.toggle("tmg-media-progress-bar", this.settings.controlPanel.progressBar);
    this.media.container.classList.remove("tmg-media-floating-player"), this.media.pseudoContainer.classList.remove("tmg-media-in-floating-player");
    this.ctlr.plug("skeleton")?.leavePseudoMode();
    this.ctlr.plug("settings.modes")?.miniplayer?.toggle();
    this.media.state.pictureInPicture = false;
  }

  public syncFeatures(): void {
    if (this.config.disabled) return void (this.media.features.pictureInPicture = this.media.features.floatingPlayer = false);
    if (!this.config.floatingPlayer.disabled) this.media.features.floatingPlayer ||= supportsPictureInPicture(false) && this.ctlr.isNativeEl;
    else this.media.features.floatingPlayer = false;
    this.media.features.pictureInPicture ||= this.media.features.floatingPlayer || (this.ctlr.isNativeEl && supportsPictureInPicture() && !this.media.state.disablePictureInPicture);
  }

  protected override onDestroy(): void {
    this.floatingWindow?.close(), this.placeholder?.destroy(), this.pseudoPlaceholder?.destroy(), super.onDestroy();
  }
}

declare module "@defs/registries" {
  interface PinRegistryMap {
    "modes.pictureInPicture": typeof ModesPictureInPicturePin;
  }
}

declare module "@defs/contract" {
  interface MediaExtraFeatures {
    floatingPlayer: boolean;
  }
}
