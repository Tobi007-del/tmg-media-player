import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import { formatMediaTime } from "@utils/time";
import { capitalize } from "@utils/str";
import { isStr, isNum, getUniqueOpts } from "@utils/obj";
import type { MetadataPlug } from "@plugs/settings/metadata";
import { formatSize } from "@utils/file";
import { UITuple } from "@defs/UIOptions";
import { silence } from "sia-reactor/modules";

export const getSettingsMetadataMenu = (plug: MetadataPlug): SettingsMenuItem[] => [
  {
    id: "loop",
    label: "Loop",
    icon: "loop",
    widget: "toggle",
    getValue: () => (plug.media.state.loop ? "On" : "Off"),
    onChange: (val: boolean) => (plug.media.intent.loop = val),
    mediaPaths: ["state.loop"],
  },
  {
    id: "quality",
    label: "Quality",
    icon: "quality",
    widget: "select",
    feature: "levels",
    hidden: () => plug.media.status.levels.length <= 1,
    getTipHTML: (bw = plug.media.status.bandwidth) => `Adjust ${plug.media.type} quality or use auto (adaptive). ${bw ? `Your last known network speed is ~${formatSize(bw, 1).replace(/(?:(B|bytes))$/i, "bps")}.` : ""}`,
    getValue() {
      const list = plug.media.status.levels;
      if (!list || !list.length || plug.media.state.currentLevel === -1) return "";
      const opts = this.getOptions!() as UITuple<number>[];
      return plug.media.state.autoLevel ? opts.at(-1)!.display : opts.find((o) => o.value === plug.media.state.currentLevel)?.display || "";
    },
    getOptions() {
      const list = plug.media.status.levels;
      if (!list || !list.length) return [{ value: -1, display: "Auto" }];
      let stringed = false;
      const getOpt = (i: number, t: any = list[i]) => {
        const label = isStr(t) ? ((stringed = true), capitalize(t)) : t?.height ? `${t.height}p${t.frameRate && Math.round(t.frameRate) > 30 ? Math.round(t.frameRate) : ""}` : t?.label || t?.id || "Unknown",
          h = t?.height || parseInt(label.match(/\d{3,}/)?.[0] || "0");
        // prettier-ignore
        return { value: i, display: label, infoText: (t?.bandwidth || t?.bitrate) ? formatSize(t.bandwidth || t.bitrate, 1).replace(/(?:(B|bytes))$/i, "bps") : "", badge: plug.config.levelBadges[`${h}p`] || Object.entries(plug.config.levelBadges).find(([k]) => h >= parseInt(k))?.[1] };
      };
      const opts = getUniqueOpts(Array.from(list).reduce((acc: any[], t: any, i) => (isStr(t) && t.toLowerCase() === "auto" ? acc : acc.push(getOpt(i)), acc), [])),
        { display, infoText, badge } = plug.media.state.autoLevel ? getOpt(plug.media.state.currentLevel) : { display: "Unknown", infoText: "", badge: undefined };
      return !stringed && opts.reverse(), opts.push({ value: -1, display: `Auto${display !== "Unknown" ? ` (${display})` : ""}`, infoText, badge }), opts;
    },
    onChange: (val: number) => (val === -1 ? (plug.media.intent.autoLevel = true) : (plug.media.intent.currentLevel = val)),
    mediaPaths: ["status.levels", "state.currentLevel", "state.autoLevel"],
  },
  {
    id: "audioTracks",
    label: "Audio track",
    icon: "audiotrack",
    widget: "select",
    feature: "audioTracks",
    hidden: () => plug.media.status.audioTracks.length <= 1,
    getValue() {
      const list = plug.media.status.audioTracks;
      if (!list || !list.length || plug.media.state.currentAudioTrack === -1) return "";
      const track = list[plug.media.state.currentAudioTrack];
      return track?.label || track?.language || `Track ${plug.media.state.currentAudioTrack + 1}`;
    },
    getOptions() {
      const list = plug.media.status.audioTracks;
      return !list || !list.length ? [] : Array.from(list, (t, i) => ({ value: i, display: t.label || t.language || `Track ${i + 1}` }));
    },
    onChange: (val: number) => (plug.media.intent.currentAudioTrack = val),
    mediaPaths: ["status.audioTracks", "state.currentAudioTrack"],
  },
  {
    id: "videoTracks",
    label: "Video track",
    icon: "videotrack",
    widget: "select",
    feature: "videoTracks",
    hidden: () => plug.media.status.videoTracks.length <= 1,
    getValue() {
      const list = plug.media.status.videoTracks;
      if (!list || !list.length || plug.media.state.currentVideoTrack === -1) return "";
      const track = list[plug.media.state.currentVideoTrack];
      return track?.label || track?.language || `Track ${plug.media.state.currentVideoTrack + 1}`;
    },
    getOptions() {
      const list = plug.media.status.videoTracks;
      return !list || !list.length ? [] : Array.from(list, (t, i) => ({ value: i, display: t.label || t.language || `Track ${i + 1}` }));
    },
    onChange: (val: number) => (plug.media.intent.currentVideoTrack = val),
    mediaPaths: ["status.videoTracks", "state.currentVideoTrack"],
  },
  {
    id: "captions",
    label: "Captions",
    icon: "captions",
    widget: "select",
    feature: "textTracks",
    getValue() {
      const list = plug.media.status.textTracks;
      return !list || !list.length || plug.media.state.currentTextTrack === -1 ? "Off" : list[plug.media.state.currentTextTrack]?.label || list[plug.media.state.currentTextTrack]?.language || `Track ${plug.media.state.currentTextTrack + 1}`;
    },
    getOptions() {
      const list = plug.media.status.textTracks;
      return !list || !list.length ? [{ value: -1, display: "Off" }] : Array.from(list, (t, i) => ({ value: i, display: t.label || t.language || `Track ${i + 1}` }));
    },
    onChange: (val: number) => (plug.media.intent.currentTextTrack = val),
    mediaPaths: ["status.textTracks", "state.currentTextTrack", "features.textTracks"],
  },
  {
    id: "chapters",
    label: "Chapters",
    icon: "chapters",
    widget: "select",
    feature: "currentChapter",
    hidden: () => plug.media.settings.metadata.chapterInfo.length <= 1,
    getTipHTML: (len = plug.media.settings.metadata.chapterInfo.length) => (len ? `Navigate through your ${plug.media.type}'s ${len} chapters` : ""),
    getValue() {
      const list = plug.media.settings.metadata.chapterInfo;
      if (!list || !list.length || plug.media.state.currentChapter === -1) return "";
      const chapter = list[plug.media.state.currentChapter];
      return chapter?.title || `Chapter ${plug.media.state.currentChapter + 1}`;
    },
    getOptions() {
      const list = plug.media.settings.metadata.chapterInfo;
      return !list || !list.length ? [] : list.map((c: any, i: number) => ({ value: i, display: c.title || `Chapter ${i + 1}`, infoText: isNum(c.startTime) ? formatMediaTime({ time: c.startTime }) : undefined }));
    },
    onChange: (val: number) => silence(() => (plug.media.intent.currentChapter = val)),
    mediaPaths: ["settings.metadata.chapterInfo", "state.currentChapter", "features.currentChapter"],
  },
];

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.metadata": typeof getSettingsMetadataMenu;
  }
}
