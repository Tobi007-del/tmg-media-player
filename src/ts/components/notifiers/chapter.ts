import { BaseNotifier, ComponentState } from "./base";
import { createEl } from "@utils/dom";
import type { REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";

export class ChapterNotifier extends BaseNotifier<undefined, ComponentState, HTMLDivElement> {
  public static readonly componentName = "chapternotifier";
  public static readonly triggers = ["chapter"];

  public override create() {
    return (this.element = createEl("div", { className: "tmg-media-chapter-notifier tmg-media-text-notifier tmg-media-top-text-notifier", innerHTML: "Current Chapter" }));
  }

  public override wire(): void {
    super.wire();
    // Ctlr Media Listeners
    this.media.on("state.currentChapter", this.handleChapterState, { init: this.ctlr.payload.wired, signal: this.signal });
  }

  protected handleChapterState(e: REvent<CtlrMedia, "state.currentChapter">): void {
    const chapter = this.media.settings.metadata.chapterInfo?.[e.value];
    this.el.textContent = chapter?.title || `Chapter ${e.value + 1}`;
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    chapternotifier: typeof ChapterNotifier;
  }
}
