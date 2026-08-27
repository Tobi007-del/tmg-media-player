import { BasePlug } from "../../base";
import type { PlaylistConfig, PlaylistItemConfig, PlaylistState } from "./types";
import { PLAYLIST_BUILD, PLAYLIST_ITEM_BUILD } from "./build";
import type { CtlrConfig } from "@defs/config";
import { type REvent } from "sia-reactor";
import { mergeObjs, fanout, parsePathObj, deepClone } from "sia-reactor/utils";
import { silence, transaction } from "sia-reactor/modules";
import { isBool } from "@utils/obj";
import { isSameURL } from "@utils/str";
import { safeNum } from "@utils/num";
import { smartFlatSort } from "@utils/file";
import { Controller } from "@core/controller";

export class PlaylistPlug extends BasePlug<PlaylistConfig, PlaylistState> {
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
    super(ctlr, config, { currentIndex: 0, sortOrder: "asc" });
  }

  public override wire(): void {
    // State Listeners
    this.state.on("currentIndex", this.syncFeatures, { signal: this.signal });
    this.state.on("sortOrder", ({ value }) => (this.media.container.dataset.playlistSort = value), { init: true, signal: this.signal });
    // Ctlr Config Getters
    this.ctlr.config.get("playlist.content", (v) => (v?.length ? v : null), { signal: this.signal });
    // ----------- Setters
    this.ctlr.config.set("playlist.content", (v) => (v ? (v.map((i) => mergeObjs(deepClone(PLAYLIST_ITEM_BUILD) as any, parsePathObj(i))) as any) : null), { init: true, signal: this.signal });
    // ---- Media Watchers
    this.media.watch("tech", this.syncFeatures, { init: true, signal: this.signal });
    this.media.watch("state.poster", (v) => this.config.content && !this.applying && (this.config.content[this.state.currentIndex].media.intent.poster = v), { signal: this.signal });
    this.media.watch("status.duration", (v) => this.config.content && !this.applying && (this.config.content[this.state.currentIndex].media.status.duration = v), { signal: this.signal });
    for (const key of ["title", "artist", "profile", "artwork", "chapterInfo"] as const) this.media.watch(`settings.metadata.${key}`, (v) => this.config.content && !this.applying && (this.config.content[this.state.currentIndex].media.settings.metadata[key] = v as any), { init: this.ctlr.payload.wired && "auto", signal: this.signal });
    for (const key of ["title", "artist", "profile"] as const) this.media.watch(`settings.metadata.links.${key}`, (v) => this.config.content && !this.applying && (this.config.content[this.state.currentIndex].media.settings.metadata.links[key] = v), { init: this.ctlr.payload.wired && "auto", signal: this.signal });
    // ---- Config Watchers
    this.ctlr.config.watch("settings.time.start", (v) => this.config.content && !this.applying && (this.config.content[this.state.currentIndex].settings.time.start = v), { init: this.ctlr.payload.wired && "auto", signal: this.signal });
    for (const key of ["previews", "marks"] as const) this.ctlr.config.watch(`settings.controlPanel.timeline.${key}`, (v) => this.config.content && !this.applying && (this.config.content[this.state.currentIndex].settings.controlPanel.timeline[key] = v as any), { init: this.ctlr.payload.wired && "auto", signal: this.signal });
    // ----------- Listeners
    this.ctlr.config.on("playlist.content", this.handleContent, { signal: this.signal, init: true, depth: 1 });
    this.ctlr.config.on("playlist.allowOverride", this.syncFeatures, { signal: this.signal });
    // Post Wiring
    this.ctlr.addAction("previous", { fn: this.previous, keyboard: { phase: "keydown" } }, this.signal), this.ctlr.addAction("next", { fn: this.next, keyboard: { phase: "keydown" } }, this.signal);
    super.wire();
  }

  protected handleContent({ currentTarget: { value: content } }: REvent<CtlrConfig, "playlist.content", 1>): void {
    this.syncFeatures();
    const idx = content?.findIndex((v) => (v.media.settings.metadata.id && v.media.settings.metadata.id === this.media.settings.metadata.id) || isSameURL(v.media.intent.src, this.media.intent.src)) ?? -1;
    this.state.currentIndex = idx === -1 ? 0 : idx;
    const pmdle = this.ctlr.plug("settings.persist")?.module,
      apply = () => (content?.[idx] ? this.applyItem(content[idx], "Playlist update") : this.moveTo(this.state.currentIndex));
    pmdle && !pmdle.state.hydrated ? pmdle.state.wonce("hydrated", apply, { signal: this.signal }) : apply();
  }

  protected applyItem(item: PlaylistItemConfig, txLabel?: string): void {
    (this.applying = true), fanout(this.settings, item.settings, { cloneSets: true, txLabel }), fanout(this.media, item.media, { cloneSets: true, txLabel }), (this.applying = false);
  }
  protected applying = false;

  public moveTo(i: number, play?: boolean, label = `move to ${i + 1} of ${this.config.content?.length}`): void {
    if (!this.config.content || !this.config.content[i]) return;
    this.state.currentIndex = i;
    this.applyItem(this.config.content![i], `Playlist ${label}`), isBool(play) && silence(() => (this.media.intent.paused = !play));
  }

  public previous(): void {
    if (safeNum(this.media.state.currentTime) >= this.media.settings.timePlayedMin) transaction(() => ((this.media.intent.currentTime = 0), (this.media.intent.paused = false)), "Playlist previous (Restart)");
    else this.config.content && this.state.currentIndex > 0 && this.moveTo(this.state.currentIndex - 1, true, "previous");
  }
  public next(): void {
    if (this.config.content && this.state.currentIndex < this.config.content.length - 1) this.moveTo(this.state.currentIndex + 1, true, "next");
  }

  public sort(order: "asc" | "desc" = this.state.sortOrder === "asc" ? "desc" : "asc", list = this.config.content): void {
    if (!list) return;
    this.state.sortOrder = order;
    const sorted = smartFlatSort(list, (i) => i.media.settings.metadata.title || "");
    this.config.content = order === "desc" ? sorted.reverse() : sorted;
  }
  public shuffle(list = this.config.content): void {
    if (!list) return;
    const shuffled = [...list];
    for (let i = shuffled.length - 1, j = Math.floor(Math.random() * (i + 1)); i > 0; i--) [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    this.config.content = shuffled;
  }
  public remove(index: number, list = this.config.content): void {
    list?.splice(index, 1), index === this.state.currentIndex && list?.length && this.moveTo(Math.min(index, list.length - 1));
  }

  public syncFeatures(): void {
    this.media.features.playlist = !!(this.config.content?.length || this.config.allowOverride.add);
    (this.media.features.nextItem = !this.atLast), (this.media.features.previousItem = !this.atFirst);
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
    nextItem?: boolean;
    previousItem?: boolean;
  }
}

export type * from "./types";
export * from "./build";
