import { BaseNotifier, ComponentState } from "./base";
import { createEl } from "@utils/dom";
import type { REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";

export class ChapterNotifier extends BaseNotifier<undefined, ComponentState, HTMLDivElement> {
  public static readonly componentName = "chapterNotifier";
  public static readonly triggers = ["chapter"];

  public override create() {
    return (this.element = createEl("div", { className: "tmg-media-chapter-notifier tmg-media-text-notifier", innerHTML: "Current Chapter" }));
  }

  public override wire(): void {
    super.wire();
    // Ctlr Media Listeners
    this.media.on("intent.currentChapter", this.handleChapterIntent, { init: this.ctlr.flags.wired, signal: this.signal }); // #I/S EXCEPTION: state is not desire
  }

  protected handleChapterIntent({ value }: REvent<CtlrMedia, "intent.currentChapter">): void {
    const chapter = this.media.settings.metadata.chapterInfo[value as number];
    this.el.textContent = chapter ? chapter.title || `Chapter ${(value as number) + 1}` : "";
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    chapterNotifier: typeof ChapterNotifier;
  }
}
