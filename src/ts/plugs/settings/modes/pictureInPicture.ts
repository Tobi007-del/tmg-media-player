import { BasePin } from "../../base";
import { ModesPlug } from "./index";
import type { ModesPictureInPicture } from "./types";
import { MODES_PICTURE_IN_PICTURE_BUILD } from "./build";
import type { REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";
import type { CtlrConfig } from "@defs/config";
import { handleDOMMutation } from "@tools/runtime";
import { createEl, loadResource, observeMutation, supportsPictureInPicture } from "@utils/dom";
import { mockAsync, breath } from "@utils/fn";
import { isStr } from "@utils/obj";
import { isSameURL } from "@utils/str";
import { PiPPlaceholder } from "@components/pipplaceholder";
import { ComponentRegistry } from "@core/registries";

export class ModesPictureInPicturePin extends BasePin<ModesPlug, ModesPictureInPicture> {
  public static readonly pinName = "pictureInPicture";
  public static get Plug() {
    return ModesPlug;
  }
  public static readonly BUILD = MODES_PICTURE_IN_PICTURE_BUILD;
  public inFloatingPlayer = false; // a quick notice flag for external deps
  public floatingWindow: (Window & typeof globalThis) | null = null;
  protected placeholder: PiPPlaceholder | null = null;
  protected pseudoPlaceholder: PiPPlaceholder | null = null;
  public whitelist: string[] = [];
  public blacklist: string[] = [];

  public override mount(): void {
    // Variables Assignment
    this.placeholder = ComponentRegistry.init("pipplaceholder", this.ctlr);
    this.pseudoPlaceholder = ComponentRegistry.init("pipplaceholder", this.ctlr);
    // DOM Injection
    this.placeholder && this.ctlr.DOM.controlsContainer?.prepend(this.placeholder.el);
    this.pseudoPlaceholder && this.media.pseudoContainer.prepend(this.pseudoPlaceholder.el);
  }

  public override wire(): void {
    // Ctlr Config Listeners
    this.ctlr.config.on("settings.modes.pictureInPicture.disabled", this.handleDisabled, { init: true, signal: this.signal });
    // ---- Media --------
    this.media.on("tech", () => !this.config.disabled && (this.media.features.pictureInPicture ||= supportsPictureInPicture() && !this.media.state.disablePictureInPicture), { signal: this.signal });
    this.media.on("intent.pictureInPicture", this.handlePictureInPictureIntent, { capture: true, init: this.ctlr.payload.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    // ---- State --------
    this.media.on("state.pictureInPicture", this.handlePictureInPictureState, { init: this.ctlr.payload.wired, signal: this.signal });
    // Post Wiring
    this.ctlr.plug("settings.keys")?.register("pictureInPicture", () => (this.media.intent.pictureInPicture = !this.media.state.pictureInPicture), { phase: "keyup" });
  }

  protected handleDisabled({ value }: REvent<CtlrConfig, "settings.modes.pictureInPicture.disabled">): void {
    this.media.features.pictureInPicture = !value && supportsPictureInPicture() && !this.media.state.disablePictureInPicture;
    if (value && (this.ctlr.isUIActive("pictureInPicture") || this.ctlr.isUIActive("floatingPlayer"))) this.media.intent.pictureInPicture = false;
  }

  protected handlePictureInPictureIntent(e: REvent<CtlrMedia, "intent.pictureInPicture">): void {
    if (e.resolved) return;
    const pipActive = this.ctlr.isUIActive("pictureInPicture");
    if (this.config.disabled && !pipActive && !this.inFloatingPlayer) return e.resolve(this.name);
    if (!this.ctlr.isNativeTech && this.config.floatingPlayer.disabled) return e.reject(this.name);
    if (this.ctlr.plug("settings.modes")?.fullscreen?.inFullscreen) this.media.intent.fullscreen = false;
    if (!pipActive && (window as any).documentPictureInPicture && !this.config.floatingPlayer.disabled) {
      e.value && !this.inFloatingPlayer ? this.initFloatingPlayer() : this.floatingWindow?.close();
      e.resolve(this.name);
    } // tech will handle PiP toggle if not using floating player
  }

  protected async handlePictureInPictureState({ value }: REvent<CtlrMedia, "state.pictureInPicture">): Promise<void> {
    if (this.floatingWindow) return;
    if (value) {
      this.media.container.classList.add("tmg-media-picture-in-picture");
      this.ctlr.plug("settings.overlay")?.show();
      this.media.intent.miniplayer = false;
      this.ctlr.plug("media")?.syncSession();
    } else {
      await mockAsync(180);
      this.media.container.classList.remove("tmg-media-picture-in-picture");
      this.ctlr.plug("settings.modes")?.miniplayer?.toggle();
      this.ctlr.plug("settings.overlay")?.delay();
    }
  }

  protected async initFloatingPlayer(): Promise<void> {
    if (this.inFloatingPlayer) return;
    (window as any).documentPictureInPicture?.window?.close?.();
    this.media.intent.miniplayer = false;
    this.floatingWindow = await (window as any).documentPictureInPicture.requestWindow(this.config.floatingPlayer);
    this.inFloatingPlayer = true;
    this.floatingWindow!.document.documentElement.style.cssText = `height:100%; background:url(${this.ctlr.config.media?.profile}) center / 32px no-repeat, url(${this.media.state.poster}) center / ${this.ctlr.settings.css.bgSafeObjectFit} no-repeat, black;`;
    await breath(this.floatingWindow!); // rendering style to keep UI visible during heavy lifting
    const cssTexts = [],
      parse = (src: any) => (isStr(src) ? src : null),
      whitelist = this.whitelist.concat([parse(window.TMG_MEDIA_CSS_SRC), parse(window.T007_TOAST_CSS_SRC), parse(window.T007_INPUT_CSS_SRC), parse(window.T007_DIALOG_CSS_SRC)].filter(Boolean) as string[]); // CSS too experimental; needs a link (href) :)
    for (const sheet of document.styleSheets) {
      try {
        const nope = (src: string) => isSameURL(src, sheet.href);
        if (!whitelist.some(nope) && !this.blacklist.some(nope)) for (const cssRule of sheet.cssRules) if ((cssRule as CSSStyleRule).selectorText?.includes(":root") || cssRule.cssText.includes("tmg") || cssRule.cssText.includes("t007")) cssTexts.push(cssRule.cssText);
      } catch {
        continue;
      }
    }
    this.floatingWindow!.document.head.append(createEl("style", { textContent: cssTexts.join("\n") }));
    await Promise.all(whitelist.map((href) => href.includes(".css") && loadResource(href, "style", undefined, this.floatingWindow!)));
    this.ctlr.plug("skeleton")?.activatePseudoMode();
    this.media.container.classList.add("tmg-media-floating-player", "tmg-media-progress-bar");
    this.floatingWindow!.document.body.append(this.media.container);
    this.floatingWindow!.document.documentElement.id = document.documentElement.id;
    this.floatingWindow!.document.documentElement.className = document.documentElement.className;
    document.documentElement.getAttributeNames().forEach((attr) => this.floatingWindow!.document.documentElement.setAttribute(attr, document.documentElement.getAttribute(attr)!));
    this.signal.addEventListener("abort", observeMutation(this.floatingWindow!.document.documentElement, handleDOMMutation, { childList: true, subtree: true }), { once: true });
    this.floatingWindow!.addEventListener("resize", this.handleFloatingPlayerResize, { signal: this.signal });
    this.floatingWindow!.addEventListener("pagehide", this.handleFloatingPlayerClose, { signal: this.signal });
    this.ctlr.plug("settings.keys")?.setEventListeners();
    this.media.state.pictureInPicture = true;
  } // #STANDALONE: needs scoped behavior

  protected handleFloatingPlayerResize(): void {
    this.config.floatingPlayer.width = this.floatingWindow?.innerWidth ?? this.config.floatingPlayer.width;
    this.config.floatingPlayer.height = this.floatingWindow?.innerHeight ?? this.config.floatingPlayer.height;
  }

  protected handleFloatingPlayerClose(): void {
    this.inFloatingPlayer = false;
    this.floatingWindow = null;
    this.media.container.classList.toggle("tmg-media-progress-bar", this.ctlr.settings.controlPanel.progressBar);
    this.media.container.classList.remove("tmg-media-floating-player");
    this.ctlr.plug("skeleton")?.deactivatePseudoMode();
    this.ctlr.plug("settings.modes")?.miniplayer?.toggle();
    this.media.state.pictureInPicture = false;
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
