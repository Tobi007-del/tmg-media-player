import type { PlaylistPlug } from "@plugs/main/playlist";
import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import { PLAYLIST_ITEM_BUILD } from "@plugs/main/playlist/build";
import { mergeObjs } from "sia-reactor/utils";
import { AUDIO_EXTENSIONS, MATCH_URL_YOUTUBE, MATCH_URL_VIMEO } from "@utils/match";

const getContent = (plug: PlaylistPlug, basic = true) => {
  if (plug.config.content?.length) return plug.config.content;
  if (basic) return [{ media: { intent: { src: plug.media.state.src }, settings: { metadata: { title: plug.media.settings.metadata.title } }, status: { duration: plug.media.status.duration } }, settings: { time: { start: plug.settings.time.start } } }];
  const { title, artist, profile, artwork, chapterInfo, links } = plug.media.settings.metadata;
  return [{ ...mergeObjs(PLAYLIST_ITEM_BUILD as any, { media: { intent: { src: plug.media.state.src, poster: plug.media.state.poster, tracks: plug.media.state.tracks }, settings: { metadata: { title, artist, profile, artwork, chapterInfo, links } }, status: { duration: plug.media.status.duration } }, settings: { time: { start: plug.settings.time.start }, controlPanel: { timeline: { previews: plug.settings.controlPanel.timeline.previews, marks: [...(plug.settings.controlPanel.timeline.marks || [])] } } } }) }];
};

export const getMainPlaylistMenu = (plug: PlaylistPlug): SettingsMenuItem => ({
  id: "playlist",
  label: "Playlist",
  icon: "playlist",
  widget: "drag-select",
  feature: "playlist",
  configPaths: ["playlist", "playlist.content"],
  onWire: (syncUI, signal) => plug.state.on("currentIndex", syncUI, { signal }),
  getValue: () => getContent(plug)[plug.state.currentIndex]?.media.settings.metadata.title || `Item ${plug.state.currentIndex + 1}`,
  getOptions: () => getContent(plug).map((opt: any, i: number, _, src = opt.media.intent.src || "", dur = opt.media.status.duration, start = opt.settings.time.start) => ({ value: String(i), display: opt.media.settings.metadata.title || `Item ${i + 1}`, badge: MATCH_URL_YOUTUBE.test(src) ? "YouTube" : MATCH_URL_VIMEO.test(src) ? "Vimeo" : AUDIO_EXTENSIONS.test(src) ? "Audio" : "", progress: dur && start ? Math.round((start / dur) * 100) : 0 })),
  getDisabled: () => !plug.config.content?.length && !plug.config.allowOverride.add,
  onChange: (val: string) => plug.moveTo(Number(val), true),
  onReorder: (oldIdx: number, newIdx: number) => (plug.config.allowOverride.move ? plug.config.content?.splice(newIdx, 0, plug.config.content.splice(oldIdx, 1)[0]) : undefined),
  onDelete: async (idx: number) => {
    if (!plug.config.allowOverride.delete) return;
    const itemTitle = getContent(plug)[idx]?.media.settings.metadata.title || `Item ${idx + 1}`;
    if (await t007.confirm?.(`Delete "${itemTitle}" from your playlist? This cannot be undone.`, { id: `${plug.ctlr.config.id}-playlist-del-confirm`, rootElement: plug.ctlr.plug("settings.settingsView")?.menu?.element ?? plug.media.container, confirmText: "Delete" })) plug.remove(idx);
  },
  onEdit: (idx: number) => (plug.config.allowOverride.edit ? ((plug.state.editIndex = idx), plug.ctlr.plug("settings.settingsView")?.menu?.goTo("playlist-edit")) : undefined),
  getTipHTML: () => (plug.config.allowOverride.move ? "You can drag items to reorder your playlist" : ""),
  actions: [...(plug.config.allowOverride.move ? [{ id: "sort", getLabel: () => "Sort", icon: "sort", onClick: plug.sort } as const, { id: "shuffle", getLabel: () => "Shuffle", icon: "shuffle", onClick: plug.shuffle } as const] : []), ...(plug.config.allowOverride.add ? [{ id: "add", getLabel: () => "Add", icon: "add", onClick: () => plug.ctlr.plug("settings.settingsView")?.menu?.goTo("playlist-add") } as const] : [])],
  items: [
    {
      id: "playlist-add",
      label: "Add to Playlist",
      icon: "add",
      widget: "input",
      inputs: [
        { name: "src", label: "Video URL", placeholder: "https://www.youtube.com/...", type: "url", required: true, helperText: { info: "Input any media (video or audio) url" } },
        { name: "title", label: "Title", placeholder: "There's Something About Kosi", type: "text" },
      ],
      getValue: () => "",
      getTipHTML: () => "YouTube and Vimeo urls are supported, as well as direct public or local media urls (mp4, webm, mp3, etc).",
      onChange: (vals: any) => (plug.config.content = [...getContent(plug, false), mergeObjs(PLAYLIST_ITEM_BUILD as any, { media: { intent: { src: vals.src }, settings: { metadata: { title: vals.title } } } } as any)] as any),
    },
    {
      id: "playlist-edit",
      label: "Edit Playlist Item",
      icon: "edit",
      widget: "input",
      inputs: [
        { name: "src", label: "Video URL", placeholder: "https://www.youtube.com/...", type: "url", required: true, value: () => getContent(plug)[plug.state.editIndex]?.media.intent.src || "", helperText: { info: "Input any media (video or audio) url" } },
        { name: "title", label: "Title", placeholder: "There's Something About Kosi", type: "text", value: () => getContent(plug)[plug.state.editIndex]?.media.settings.metadata.title || "" },
      ],
      getValue: () => "",
      onChange: (vals: any, c = plug.config.content) => (((c?.length ? c[plug.state.editIndex] : plug).media.intent.src = vals.src), ((c?.length ? c[plug.state.editIndex] : plug).media.settings.metadata.title = vals.title)),
    },
  ],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    playlist: typeof getMainPlaylistMenu;
  }
}
