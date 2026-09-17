import { MediaType } from "@defs/generics";
import { createEl } from "./dom";

export { onAllMethods, bindAllMethods, guardAllMethods, guardMethod } from "@t007/utils";

// Capbailities
export const DUMMY_VID = createEl("video");
export const DUMMY_AUD = createEl("audio");
export function canUseVolume(type: MediaType = "video", dummy = type === "video" ? DUMMY_VID : DUMMY_AUD): boolean {
  try {
    const prev = dummy.volume;
    dummy.volume = 0.5;
    const works = dummy.volume === 0.5;
    return (dummy.volume = prev), works;
  } catch {
    return false;
  }
}
export const canMuteVolume = (type: MediaType = "video", dummy = type === "video" ? DUMMY_VID : DUMMY_AUD): boolean => !!dummy && "muted" in dummy;
export function canUseRate(type: MediaType = "video", dummy = type === "video" ? DUMMY_VID : DUMMY_AUD): boolean {
  try {
    const prev = dummy.playbackRate;
    dummy.playbackRate = 0.5;
    const works = dummy.playbackRate === 0.5;
    return (dummy.playbackRate = prev), works;
  } catch {
    return false;
  }
}
export const canTextTracks = (type: MediaType = "video", dummy = type === "video" ? DUMMY_VID : DUMMY_AUD): boolean => !!dummy && "textTracks" in dummy;
export const canVideoTracks = (type: MediaType = "video", dummy = type === "video" ? DUMMY_VID : DUMMY_AUD): boolean => !!dummy && "videoTracks" in dummy;
export const canAudioTracks = (type: MediaType = "video", dummy = type === "video" ? DUMMY_VID : DUMMY_AUD): boolean => !!dummy && "audioTracks" in dummy;
