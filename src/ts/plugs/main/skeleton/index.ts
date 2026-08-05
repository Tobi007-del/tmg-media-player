import { BasePlug } from "../../base";
import type { SkeletonConfig } from "./types";
import { SKELETON_BUILD } from "./build";
import type { REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";
import { assignEl } from "@utils/dom";
import { capitalize } from "@utils/str";
import { IS_MOBILE } from "@utils/env";
import { IconRegistry, MenuRegistry } from "@core/registries";
import { setTimeout } from "sia-reactor/utils";

export class SkeletonPlug extends BasePlug<SkeletonConfig> {
  public static readonly plugName = "skeleton";
  public static readonly BUILD = SKELETON_BUILD;
  public static readonly isCore: boolean = true;
  public static readonly isMain: boolean = true;
  public rootElement = document.body;

  public override mount(): void {
    // Properties Assignment
    assignEl(this.media.container, { role: "region", ariaLabel: `${capitalize(this.media.type)} Player`, className: `tmg-${this.media.type}-container tmg-media-container tmg-host-container${IS_MOBILE ? " tmg-media-mobile" : ""}${this.media.state.paused ? " tmg-media-paused" : ""}` }, { trackKind: "captions", volumeLevel: "muted", brightnessLevel: "dark", objectFit: "contain" });
    assignEl(this.media.pseudoContainer, { role: "status", className: `tmg-pseudo-${this.media.type}-container tmg-pseudo-media-container tmg-host-container` });
    assignEl(this.media.pseudoElement, { ariaHidden: "true", className: `tmg-pseudo-${this.media.type} tmg-pseudo-media tmg-host`, muted: true, autoplay: false });
    // DOM Injection
    this.media.pseudoContainer.appendChild(this.media.pseudoElement);
    this.media.element.parentElement?.insertBefore(this.media.container, this.media.element);
    this.injectInterface(), this.ctlr.DOM.containerContent?.prepend(this.media.element);
  }
  public override unmount(): void {
    if (this.media.pseudoElement.isConnected) this.media.element.isConnected && this.leavePseudoMode(true), this.media.container.remove();
    else if (this.media.element.isConnected) this.media.container.parentElement?.replaceChild(this.media.element, this.media.container);
  }

  public override wire(): void {
    // Ctlr Media Listeners
    this.media.on("state.paused", this.handlePaused, { init: this.ctlr.payload.wired, signal: this.signal });
    // this.media.on("intent.paused", this.handlePaused, { signal: this.signal }); // #APPRENTICE: folklore embodiment
    this.media.on("state.poster", ({ value }) => (this.settings.css.currentPosterUrl = `url(${value})`), { signal: this.signal });
    this.media.on("status.ended", ({ value }) => this.media.container.classList.toggle("tmg-media-replay", value), { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("status.waiting", ({ value }) => this.media.container.classList.toggle("tmg-media-buffering", value), { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("status.loadedMetadata", this.handleLoadedMetadataStatus, { init: this.ctlr.payload.wired, signal: this.signal });
    // ---- State --------
    this.ctlr.state.on("readyState", () => (this.media.container.dataset.readyTier = "x".repeat(this.ctlr.state.readyState)), { init: this.ctlr.payload.wired, signal: this.signal });
    // Post Wiring
    super.wire();
  }

  protected injectInterface(): void {
    !this.ctlr.queryDOM(".tmg-media-container-content-wrapper") &&
      this.media.container.insertAdjacentHTML(
        "beforeend",
        `<div class="tmg-media-container-content-wrapper">
          <div class="tmg-media-container-content">
            <div class="tmg-media-controls-container">
              <div class="tmg-media-curtain tmg-media-top-curtain"></div><div class="tmg-media-curtain tmg-media-bottom-curtain"></div><div class="tmg-media-curtain tmg-media-cover-curtain"></div>
            </div>
          </div>
          <div class="tmg-media-settings" inert>
            <div class="tmg-media-settings-content">
              <div class="tmg-media-settings-top-panel"><button type="button" class="tmg-media-settings-close-btn">${IconRegistry.get("returnback")}<span>Close Settings</span></button></div>
              <div class="tmg-media-settings-bottom-panel"><p>More Settings Coming Soon!</p></div>
            </div>
          </div>
        </div>`
      );
    this.ctlr.DOM.containerContentWrapper = this.ctlr.queryDOM(".tmg-media-container-content-wrapper");
    this.ctlr.DOM.containerContent = this.ctlr.queryDOM(".tmg-media-container-content");
    this.ctlr.DOM.controlsContainer = this.ctlr.queryDOM(".tmg-media-controls-container");
    this.ctlr.DOM.settings = this.ctlr.queryDOM(".tmg-media-settings");
    this.ctlr.DOM.settingsContent = this.ctlr.queryDOM(".tmg-media-settings-content");
    this.ctlr.DOM.settingsTopPanel = this.ctlr.queryDOM(".tmg-media-settings-top-panel");
    this.ctlr.DOM.settingsBottomPanel = this.ctlr.queryDOM(".tmg-media-settings-bottom-panel");
  }

  protected handlePaused({ value, rejectable, resolved }: REvent<CtlrMedia, "state.paused" | "intent.paused">): void {
    if (rejectable && !resolved) return;
    if (!rejectable && !value && this.config.autoPauseOthers) for (const media of document.querySelectorAll<HTMLMediaElement>("video, audio")) media !== this.media.element && !media.paused && media.pause();
    this.media.container.classList.toggle("tmg-media-paused", value);
  }

  protected handleLoadedMetadataStatus({ value }: REvent<CtlrMedia, "status.loadedMetadata">): void {
    if (!value) return;
    this.media.pseudoElement.src = this.media.element.currentSrc;
    this.media.pseudoElement.crossOrigin = this.media.element.crossOrigin;
  }

  public enterPseudoMode(): void {
    if (this.ctlr.state.pseudoActive) return;
    (this.media.pseudoElement.id = this.media.element.id), (this.media.element.id = "");
    this.media.pseudoElement.className += " " + this.media.element.className.replace(/tmg-(?:media|video|audio|host)/g, "");
    this.media.pseudoContainer.className += " " + this.media.container.className.replace(/tmg-(?:media|video|audio|host)-container/g, "");
    this.media.container.parentElement?.insertBefore(this.media.pseudoContainer, this.media.container);
    this.rootElement.append(this.media.container);
    this.ctlr.state.pseudoActive = true;
  }

  public leavePseudoMode(destroy = false): void {
    if (!this.ctlr.state.pseudoActive) return;
    (this.media.element.id = this.media.pseudoElement.id), (this.media.pseudoElement.id = "");
    this.media.pseudoElement.className = `tmg-pseudo-${this.media.type} tmg-pseudo-media tmg-host`;
    this.media.pseudoContainer.className = `tmg-pseudo-${this.media.type}-container tmg-pseudo-media-container tmg-host-container`;
    this.media.pseudoContainer.parentElement?.replaceChild(destroy ? this.media.element : this.media.container, this.media.pseudoContainer);
    this.ctlr.state.pseudoActive = false;
  }

  protected registerMenu(): void {
    setTimeout(() => super.registerMenu(), 0, this.signal), this.ctlr.plug("settings.settingsView")?.menu.register(MenuRegistry.get("actions")?.(this.ctlr));
  }
}

export type * from "./types";
export * from "./build";

declare module "@defs/registries" {
  interface PlugRegistryMap {
    skeleton: typeof SkeletonPlug;
  }
  interface ControllerDOMMap {
    containerContentWrapper?: HTMLDivElement | null;
    containerContent?: HTMLDivElement | null;
    controlsContainer?: HTMLDivElement | null;
    settings?: HTMLDivElement | null;
    settingsContent?: HTMLDivElement | null;
    settingsTopPanel?: HTMLDivElement | null;
    settingsBottomPanel?: HTMLDivElement | null;
  }
}

declare module "@defs/config" {
  interface CtlrConfig {
    skeleton: SkeletonConfig;
  }
}
