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
  public window: (Window & typeof globalThis) | null = null;
  protected placeholder: PiPPlaceholder | null = null;
  protected pseudoPlaceholder: PiPPlaceholder | null = null;

  public override wire(): void {
    // Ctlr Media Watchers
    this.media.watch("tech", this.syncFeatures, { init: true, signal: this.signal });
    // ---- Config --------
    this.ctlr.config.watch("settings.modes.pictureInPicture.disabled", this.syncFeatures, { signal: this.signal });
    this.ctlr.config.watch("settings.modes.pictureInPicture.floating.disabled", this.syncFeatures, { signal: this.signal });
    // ---- Media Listeners
    this.media.on("intent.pictureInPicture", this.handlePictureInPictureIntent, { capture: true, init: this.ctlr.flags.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    this.media.on("state.pictureInPicture", this.handlePictureInPictureState, { init: this.ctlr.flags.wired, signal: this.signal });
  }

  protected handlePictureInPictureIntent(e: REvent<CtlrMedia, "intent.pictureInPicture">, isPiPActive = this.ctlr.isUIActive("pictureInPicture"), canHandle = !isPiPActive && this.media.features.floating): void {
    if (e.resolved) return;
    const isActive = isPiPActive || this.ctlr.isUIActive("floating") || this.media.status.shapeShifting === "pictureInPicture";
    if (e.value && !isActive) {
      this.media.status.shapeShifting = "pictureInPicture"; // can't catch native tech
      if (this.media.state.fullscreen) {
        silence(() => (this.media.intent.fullscreen = false));
        if (canHandle) return this.media.wonce("state.fullscreen", this.initFloating, { signal: this.signal }), e.resolve(this.name);
      }
      canHandle && this.initFloating();
    } else !e.value && this.window?.close(); // looser safer
    canHandle && e.resolve(this.name);
  }

  protected async handlePictureInPictureState({ value }: REvent<CtlrMedia, "state.pictureInPicture">): Promise<void> {
    if (this.window) return;
    if (value) {
      this.media.state.miniplayer && silence(() => (this.media.intent.miniplayer = false));
      this.placeholder ??= ComponentRegistry.init("pipPlaceholder", this.ctlr);
      this.media.container.classList.add("tmg-media-picture-in-picture"), this.media.pseudoContainer.classList.add("tmg-media-in-picture-in-picture");
      this.ctlr.plug("settings.metadata")?.syncSession();
    } else {
      await mockAsync(180);
      this.media.container.classList.remove("tmg-media-picture-in-picture"), this.media.pseudoContainer.classList.remove("tmg-media-in-picture-in-picture");
    }
  }

  protected async initFloating(): Promise<void> {
    if (this.window) return;
    (window as any).documentPictureInPicture?.window?.close?.(), this.media.state.miniplayer && silence(() => (this.media.intent.miniplayer = false));
    this.window = await (window as any).documentPictureInPicture.requestWindow(this.config.floating).catch((err) => ((this.media.status.shapeShifting = false), this.ctlr.gesture("pictureInPicture", "enterPip", err), null));
    if (!this.window) return;
    this.window.document.documentElement.style.cssText = `height:100%; background:url(${this.media.settings.metadata.profile}) center / 32px no-repeat, url(${this.media.state.poster}) center / ${this.settings.css.bgObjectFit} no-repeat, black;`;
    await breath(this.window); // rendering style to keep UI visible during heavy lifting
    const cssTexts = [],
      { whitelist, blacklist } = this.config.floating.css,
      hrefsList = whitelist.url.concat([window.TMG_MEDIA_CSS_SRC, window.T007_TOAST_CSS_SRC, window.T007_INPUT_CSS_SRC, window.T007_DIALOG_CSS_SRC].filter((src) => (isStr(src) ? src : false)) as string[]); // CSS too experimental; needs a link (href) :)
    for (const sht of document.styleSheets)
      try {
        if (!hrefsList.some((s = "") => isSameURL(s, sht.href)) && !blacklist.url.some((s = "") => isSameURL(s, sht.href))) for (const { cssText: txt } of sht.cssRules) whitelist.token.some((t) => txt.includes(t)) && !blacklist.token.some((t) => txt.includes(t)) && cssTexts.push(txt);
      } catch {
        continue;
      }
    this.window.document.head.append(createEl("style", { textContent: cssTexts.join("\n") }));
    await Promise.allSettled(hrefsList.map((href) => href.includes(".css") && loadResource(href, "style", undefined, this.window!)));
    this.ctlr.plug("skeleton")?.enterPseudoMode();
    (this.pseudoPlaceholder ??= ComponentRegistry.init("pipPlaceholder", this.ctlr)) && this.media.pseudoContainer.prepend(this.pseudoPlaceholder.el);
    this.media.container.classList.add("tmg-media-floating-player", "tmg-media-progress-bar"), this.media.pseudoContainer.classList.add("tmg-media-in-floating-player");
    this.window.document.body.append(this.media.container);
    this.window.document.documentElement.id = document.documentElement.id;
    this.window.document.documentElement.className = document.documentElement.className;
    for (const attr of document.documentElement.getAttributeNames()) this.window.document.documentElement.setAttribute(attr, document.documentElement.getAttribute(attr)!);
    observeMutation(this.window.document.documentElement, handleDOMMutation, { childList: true, subtree: true }, this.signal);
    this.window.addEventListener("resize", this.handleFloatingResize, { signal: this.signal });
    this.window.addEventListener("pagehide", this.handleFloatingClose, { signal: this.signal });
    this.ctlr.plug("settings.keys")?.setListeners();
    this.media.state.pictureInPicture = this.media.status.floating = true;
  } // #STANDALONE: needs scoped behavior

  protected handleFloatingResize(): void {
    if (!this.config.floating.preferInitialWindowPlacement) (this.config.floating.width = this.window?.innerWidth ?? this.config.floating.width), (this.config.floating.height = this.window?.innerHeight ?? this.config.floating.height);
  }

  protected handleFloatingClose(): void {
    this.window = null;
    this.media.container.classList.toggle("tmg-media-progress-bar", this.settings.controlPanel.progressBar);
    this.media.container.classList.remove("tmg-media-floating-player"), this.media.pseudoContainer.classList.remove("tmg-media-in-floating-player");
    this.ctlr.plug("skeleton")?.exitPseudoMode();
    this.media.state.pictureInPicture = this.media.status.floating = false;
  }

  public syncFeatures(): void {
    this.media.tech.polyfill("floating", this.ctlr.isNativeEl && supportsPictureInPicture(false), this.config.disabled || this.config.floating.disabled);
    this.media.tech.polyfill("pictureInPicture", this.media.features.floating, this.config.disabled);
    // this.media.state.pictureInPicture && this.media.features.pictureInPicture && silence(() => (this.media.intent.pictureInPicture = false)), this.media.wonce("state.pictureInPicture", () => silence(() => (this.media.intent.pictureInPicture = true)), { signal: this.signal });
  }

  protected override onDestroy(): void {
    this.window?.close(), this.placeholder?.destroy(), this.pseudoPlaceholder?.destroy(), super.onDestroy();
  }
}

declare module "@defs/registries" {
  interface PinRegistryMap {
    "modes.pictureInPicture": typeof ModesPictureInPicturePin;
  }
}

declare module "@defs/contract" {
  interface MediaStatus {
    floating?: boolean;
  }
}
