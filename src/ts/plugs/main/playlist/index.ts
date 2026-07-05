import { BasePlug } from "../../base";
import type { PlaylistConfig, PlaylistItemConfig } from "./types";
import { PLAYLIST_BUILD, PLAYLIST_ITEM_BUILD } from "./build";
import type { CtlrConfig } from "@defs/config";
import { type REvent } from "sia-reactor";
import { mergeObjs, fanout, parsePathObj } from "sia-reactor/utils";
import { transaction } from "sia-reactor/modules";
import { isBool } from "@utils/obj";
import { isSameURL } from "@utils/str";
import { safeNum } from "@utils/num";
import { Controller } from "@core/controller";

export class PlaylistPlug extends BasePlug<PlaylistConfig> {
  public static readonly plugName = "playlist";
  public static readonly isMain: boolean = true;
  public static readonly BUILD = PLAYLIST_BUILD;
  public get atFirst() {
    return this.state.currentIndex <= 0;
  }
  public get atLast() {
    return !this.config.content || this.state.currentIndex >= this.config.content.length - 1;
  }

  constructor(ctlr: Controller, config = ctlr.config.playlist) {
    super(ctlr, config, { currentIndex: 0 });
  }

  public override wire(): void {
    // Ctlr Config Getters
    this.ctlr.config.get("playlist", (v) => v ?? { content: null }, { signal: this.signal });
    // ----------- Setters
    this.ctlr.config.set("playlist.content", (v) => (v ? (v.map((i) => mergeObjs(PLAYLIST_ITEM_BUILD as any, parsePathObj(i))) as any) : null), { init: true, signal: this.signal });
    // ---- Media Watchers
    this.media.on("settings.metadata.title", ({ value }) => this.config.content && (this.config.content[this.state.currentIndex].media.settings.metadata.title = value), { init: "auto", signal: this.signal });
    this.media.on("settings.metadata.chapterInfo", ({ value }) => this.config.content && (this.config.content[this.state.currentIndex].media.settings.metadata.chapterInfo = value), { init: "auto", signal: this.signal });
    this.media.on("settings.metadata.links.title", ({ value }) => this.config.content && (this.config.content[this.state.currentIndex].media.settings.metadata.links.title = value), { init: "auto", signal: this.signal });
    // ---- Config -------
    this.ctlr.config.on("settings.time.start", ({ value }) => this.config.content && (this.config.content[this.state.currentIndex].settings.time.start = value), { init: "auto", signal: this.signal });
    this.ctlr.config.on("settings.controlPanel.timeline.previews", ({ value }) => this.config.content && (this.config.content[this.state.currentIndex].settings.controlPanel.timeline.previews = value), { init: "auto", signal: this.signal });
    this.ctlr.config.on("settings.controlPanel.timeline.marks", ({ value }) => this.config.content && (this.config.content[this.state.currentIndex].settings.controlPanel.timeline.marks = value), { init: "auto", signal: this.signal });
    // ----------- Listeners
    this.ctlr.config.on("playlist.content", this.handleContent, { signal: this.signal, init: true, depth: 1 });
    this.ctlr.config.on("playlist.allowOverride", this.syncFeatures, { signal: this.signal });
    // Post Wiring
    this.ctlr.registerAction("prev", { fn: () => (this.previous(), this.ctlr.plug("settings.notifiers")?.notify("mediaprev")), keyboard: { phase: "keydown" } });
    this.ctlr.registerAction("next", { fn: () => (this.next(), this.ctlr.plug("settings.notifiers")?.notify("medianext")), keyboard: { phase: "keydown" } });
    super.wire();
  }

  protected handleContent({ currentTarget: { value: content } }: REvent<CtlrConfig, "playlist.content", 1>): void {
    this.syncFeatures();
    if (this.media.status.readyState < 1) return;
    const v = content?.find((v) => (v.media.settings.metadata.id && v.media.settings.metadata.id === this.media.settings.metadata.id) || isSameURL(v.media.intent.src, this.media.state.src));
    this.state.currentIndex = (v && content!.indexOf(v)) ?? 0;
    v ? this.applyItem(v, false) : this.moveTo(this.state.currentIndex);
  }

  protected applyItem(item: PlaylistItemConfig, _reset = true): void {
    fanout(this.settings, item.settings), fanout(this.media, item.media);
  }

  public moveTo(index: number, shouldPlay?: boolean, label = "Move"): void {
    if (!this.config.content || !this.config.content[index]) return;
    this.state.currentIndex = index;
    transaction(() => (this.applyItem(this.config.content![index]), isBool(shouldPlay) && (this.media.intent.paused = !shouldPlay)), `Playlist ${label}`);
  }

  public remove(index: number): void {
    if (!this.config.content) return;
    this.config.content.splice(index, 1);
    if (index === this.state.currentIndex && this.config.content.length > 0) this.moveTo(Math.min(index, this.config.content.length - 1));
  }

  public shuffle(): void {
    if (!this.config.content) return;
    const list = this.config.content;
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
  }

  public previous(): void {
    if (safeNum(this.media.state.currentTime) >= 3) transaction(() => ((this.media.intent.currentTime = 0), (this.media.intent.paused = false)), "Playlist Previous (Restart)");
    else if (this.config.content && this.state.currentIndex > 0) this.moveTo(this.state.currentIndex - 1, true, "Previous");
  }

  public next(): void {
    if (!this.config.content) return;
    if (this.state.currentIndex < this.config.content.length - 1) this.moveTo(this.state.currentIndex + 1, true, "Next");
  }

  protected syncFeatures(): void {
    this.media.features.playlist = !!(this.config.content?.length || this.config.allowOverride.add);
  }
}

declare module "@defs/registries" {
  interface PlugRegistryMap {
    playlist: typeof PlaylistPlug;
  }
}

declare module "@defs/config" {
  interface CtlrConfig {
    playlist: PlaylistConfig;
  }
}

declare module "@defs/contract" {
  interface MediaExtraFeatures {
    playlist?: boolean;
  }
}

export type * from "./types";
export * from "./build";
