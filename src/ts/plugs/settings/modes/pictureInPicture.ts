import { BasePin } from "../../base";
import { ModesPlug } from "./index";
import type { ModesPictureInPictureConfig } from "./types";
import { MODES_PICTURE_IN_PICTURE_BUILD } from "./build";
import type { REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";
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
  public floating = false; // a quick notice flag
  public floatingWindow: (Window & typeof globalThis) | null = null;
  protected placeholder: PiPPlaceholder | null = null;
  protected pseudoPlaceholder: PiPPlaceholder | null = null;

  public override wire(): void {
    // Ctlr Media Watchers
    this.media.watch("tech", this.syncFeatures, { init: true, signal: this.signal });
    // ---- Config --------
    this.ctlr.config.watch("settings.modes.pictureInPicture.disabled", this.syncFeatures, { signal: this.signal });
    this.ctlr.config.watch("settings.modes.pictureInPicture.floatingPlayer.disabled", this.syncFeatures, { signal: this.signal });
    // ---- Media Listeners
    this.media.on("intent.pictureInPicture", this.handlePictureInPictureIntent, { capture: true, init: this.ctlr.flags.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    this.media.on("state.pictureInPicture", this.handlePictureInPictureState, { init: this.ctlr.flags.wired, signal: this.signal });
    // Post Wiring
    this.ctlr.learn("pictureInPicture", undefined, this.signal);
  }

  protected handlePictureInPictureIntent(e: REvent<CtlrMedia, "intent.pictureInPicture">): void {
    if (e.resolved) return;
    const pipActive = this.ctlr.isUIActive("pictureInPicture");
    if (!this.ctlr.isNativeEl && this.config.floatingPlayer.disabled) return e.reject(this.name);
    if (e.value && this.media.state.fullscreen) silence(() => (this.media.intent.fullscreen = false));
    if (!pipActive && this.media.features.floatingPlayer) {
      e.value ? !this.floating && this.initFloatingPlayer() : this.floating && this.floatingWindow?.close();
      e.resolve(this.name);
    } // tech will handle PiP toggle if not using floating player
  }

  protected async handlePictureInPictureState({ value }: REvent<CtlrMedia, "state.pictureInPicture">): Promise<void> {
    if (this.floatingWindow) return;
    if (value) {
      this.placeholder ??= ComponentRegistry.init("pipPlaceholder", this.ctlr);
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
    if (this.floating) return;
    (window as any).documentPictureInPicture?.window?.close?.();
    silence(() => (this.media.intent.miniplayer = false));
    this.floatingWindow = await (window as any).documentPictureInPicture.requestWindow(this.config.floatingPlayer);
    this.floating = true;
    this.floatingWindow!.document.documentElement.style.cssText = `height:100%; background:url(${this.media.settings.metadata.profile}) center / 32px no-repeat, url(${this.media.state.poster}) center / ${this.settings.css.bgObjectFit} no-repeat, black;`;
    await breath(this.floatingWindow!); // rendering style to keep UI visible during heavy lifting
    const cssTexts = [],
      { whitelist, blacklist } = this.config.floatingPlayer.css,
      hrefList = whitelist.url.concat([window.TMG_MEDIA_CSS_SRC, window.T007_TOAST_CSS_SRC, window.T007_INPUT_CSS_SRC, window.T007_DIALOG_CSS_SRC].filter((src) => (isStr(src) ? src : false)) as string[]); // CSS too experimental; needs a link (href) :)
    for (const sht of document.styleSheets)
      try {
        if (!hrefList.some((s = "") => isSameURL(s, sht.href)) && !blacklist.url.some((s = "") => isSameURL(s, sht.href))) for (const { cssText: txt } of sht.cssRules) whitelist.token.some((t) => txt.includes(t)) && !blacklist.token.some((t) => txt.includes(t)) && cssTexts.push(txt);
      } catch {
        continue;
      }
    this.floatingWindow!.document.head.append(createEl("style", { textContent: cssTexts.join("\n") }));
    await Promise.allSettled(hrefList.map((href) => href.includes(".css") && loadResource(href, "style", undefined, this.floatingWindow!)));
    this.ctlr.plug("skeleton")?.enterPseudoMode();
    (this.pseudoPlaceholder ??= ComponentRegistry.init("pipPlaceholder", this.ctlr)) && this.media.pseudoContainer.prepend(this.pseudoPlaceholder.el);
    this.media.container.classList.add("tmg-media-floating-player", "tmg-media-progress-bar"), this.media.pseudoContainer.classList.add("tmg-media-in-floating-player");
    this.floatingWindow!.document.body.append(this.media.container);
    this.floatingWindow!.document.documentElement.id = document.documentElement.id;
    this.floatingWindow!.document.documentElement.className = document.documentElement.className;
    for (const attr of document.documentElement.getAttributeNames()) this.floatingWindow!.document.documentElement.setAttribute(attr, document.documentElement.getAttribute(attr)!);
    observeMutation(this.floatingWindow!.document.documentElement, handleDOMMutation, { childList: true, subtree: true }, this.signal);
    this.floatingWindow!.addEventListener("resize", this.handleFloatingPlayerResize, { signal: this.signal });
    this.floatingWindow!.addEventListener("pagehide", this.handleFloatingPlayerClose, { signal: this.signal });
    this.ctlr.plug("settings.keys")?.setListeners();
    this.media.state.pictureInPicture = true;
  } // #STANDALONE: needs scoped behavior

  protected handleFloatingPlayerResize(): void {
    if (!this.config.floatingPlayer.preferInitialWindowPlacement) (this.config.floatingPlayer.width = this.floatingWindow?.innerWidth ?? this.config.floatingPlayer.width), (this.config.floatingPlayer.height = this.floatingWindow?.innerHeight ?? this.config.floatingPlayer.height);
  }

  protected handleFloatingPlayerClose(): void {
    this.floating = false;
    this.floatingWindow = null;
    this.media.container.classList.toggle("tmg-media-progress-bar", this.settings.controlPanel.progressBar);
    this.media.container.classList.remove("tmg-media-floating-player"), this.media.pseudoContainer.classList.remove("tmg-media-in-floating-player");
    this.ctlr.plug("skeleton")?.leavePseudoMode();
    this.ctlr.plug("settings.modes")?.miniplayer?.toggle();
    this.media.state.pictureInPicture = false;
  }

  public syncFeatures(): void {
    this.media.tech.polyfill("floatingPlayer", this.ctlr.isNativeEl && supportsPictureInPicture(false), this.config.disabled || this.config.floatingPlayer.disabled);
    this.media.tech.polyfill("pictureInPicture", this.media.features.floatingPlayer || (this.ctlr.isNativeEl && supportsPictureInPicture()), this.config.disabled);
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
  interface MediaFeaturesExt {
    floatingPlayer: boolean;
  }
}
