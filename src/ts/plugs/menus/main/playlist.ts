import type { PlaylistPlug } from "@plugs/main/playlist";
import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import { PLAYLIST_ITEM_BUILD } from "@plugs/main/playlist/build";
import { mergeObjs } from "sia-reactor/utils";

export const getMainPlaylistMenu = (plug: PlaylistPlug): SettingsMenuItem => ({
  id: "playlist",
  label: "Playlist",
  icon: "playlist",
  widget: "drag-select",
  feature: "playlist",
  configPaths: ["playlist", "playlist.content"],
  getValue: () => plug.config.content?.[plug.state.currentIndex]?.media.settings.metadata.title || plug.media.settings.metadata.title || "Playlist",
  getOptions: () => (plug.config.content?.length ? plug.config.content : [{ media: { settings: { metadata: { title: plug.media.settings.metadata.title || "Unknown" } } } }]).map((opt: any, i: number) => ({ value: String(i), display: opt.media.settings.metadata.title || "Unknown" })),
  getDisabled: () => plug.config.content?.length === 0 && !plug.config.allowOverride.add,
  onChange: (val: string) => plug.moveTo(Number(val), true),
  onReorder: plug.config.allowOverride.move
    ? (oldIdx: number, newIdx: number) => {
        const p = plug.config.content;
        if (!p) return;
        const [moved] = p.splice(oldIdx, 1);
        p.splice(newIdx, 0, moved);
      }
    : undefined,
  onDelete: plug.config.allowOverride.delete ? plug.remove : undefined,
  tipHTML: plug.config.allowOverride.move ? "You can drag to reorder items" : undefined,
  actions: [...(plug.config.allowOverride.move ? [{ id: "shuffle", getLabel: () => "Shuffle", icon: "shuffle", onClick: plug.shuffle } as const] : []), ...(plug.config.allowOverride.add ? [{ id: "add", getLabel: () => "Add", icon: "add", onClick: () => plug.ctlr.plug("settings.settingsView")?.menu?.goTo("playlist-add") } as const] : [])],
  items: [
    {
      id: "playlist-add",
      label: "Add to Playlist",
      icon: "add",
      widget: "input",
      inputs: [
        { label: "Video URL", placeholder: "https://www.youtube.com/...", type: "url", required: true, helperText: { info: "Input any media (video or audio) url" } },
        { label: "Title", placeholder: "My Awesome Video", type: "text" },
      ],
      getValue: () => "",
      onChange: (vals: any) => {
        const firstItem = { media: { intent: { src: plug.media.state.src }, settings: { metadata: { title: plug.media.settings.metadata.title || "Unknown", chapterInfo: plug.media.settings.metadata.chapterInfo, links: { title: plug.media.settings.metadata.links.title } } } }, settings: { time: { start: plug.settings.time.start }, controlPanel: { timeline: { previews: plug.settings.controlPanel.timeline.previews, marks: [...(plug.settings.controlPanel.timeline.marks || [])] } } } },
          newItem = { media: { intent: { src: vals["Video URL"] }, settings: { metadata: { title: vals["Title"] } } } };
        plug.config.content = [...(plug.config.content ?? [mergeObjs(PLAYLIST_ITEM_BUILD as any, firstItem as any)]), mergeObjs(PLAYLIST_ITEM_BUILD as any, newItem as any)] as any;
        plug.ctlr.plug("settings.settingsView")?.menu?.goBack();
      },
    },
  ],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    playlist: typeof getMainPlaylistMenu;
  }
}
