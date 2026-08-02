import type { Controller } from "./controller";
import type { Inert, Intent, State, Volatile } from "sia-reactor";
import { MediaType, Sources, Src, SrcObject, Tracks, Metadata } from "./generics";
import type { ObjectFit } from "@plugs/settings/objectFit/types";
import type { CueLike } from "@plugs/settings/captions/types";
import type { BaseTech } from "@techs/base";

export interface MediaContract {
  // "Must Haves" to be considered media
  src: Src;
  currentTime: number;
  duration: number;
  paused: boolean;
  ended: boolean;
}

export interface MediaState {
  // --- The Big Three (Promise-based State) ---
  src: MediaContract["src"]; // Rejects if network fails or format unsupported
  currentTime: MediaContract["currentTime"]; // Rejects if outside seekable range
  paused: MediaContract["paused"]; // Rejects if "Autoplay Policy" denies it
  // --- The Engine Inputs (Interceptable) ---
  volume: number; // 0 - 100
  muted: boolean;
  brightness: number; // 0 - 100
  dark: boolean;
  playbackRate: number;
  // --- The Presentation Modes (Heavily Rejectable) ---
  pictureInPicture: boolean;
  fullscreen: boolean;
  fullscreenOrientation: OrientationType | false;
  autoFullscreenOrientation: boolean;
  theater: boolean;
  miniplayer: boolean;
  ambience: boolean;
  locked: boolean;
  // --- Casting (Connection Handshakes) ---
  airplay: boolean; // Apple AirPlay
  cast: boolean; // Google Cast
  // --- VR / XR (Spatial Realities) ---
  xrSession: boolean; // Request "Immersive Mode" (Handshake)
  xrMode: "inline" | "immersive-vr" | "immersive-ar"; // Hardware target
  xrReferenceSpace: "local" | "local-floor" | "bounded-floor" | "unbounded";
  // --- Projection & Stereo (The "Content" Logic) ---
  projection: "flat" | "equirectangular" | "cubemap" | "cylindrical";
  stereoMode: "mono" | "sbs" | "top-bottom" | "vr180" | "none"; // Side-by-Side vs Top-Bottom
  // --- Camera & Viewport (The "Lens") ---
  fieldOfView: number; // Vertical aperture in degrees (Vertical FOV)
  viewRatio: number; // Horizontal expansion factor (Width / Height)
  // --- Orientation (The "Head/Camera" Pose) ---
  panningX: number; // Yaw (Left/Right)
  panningY: number; // Pitch (Up/Down)
  panningZ: number; // Roll (Tilt/Barrel)
  // --- Interaction (XR Controllers) ---
  xrInputSource: ArrayLike<any>; // Reference to active controllers/hand-tracking
  // --- Track Switching (Async Buffering/Streaming) --- NOTE: "-1" is "Disabled" or a no-op
  currentChapter: number;
  currentTextTrack: number; // Subtitle
  currentAudioTrack: number; // Language (English -> Spanish)
  currentVideoTrack: number; // Angle
  currentLevel: number; // Quality (280p -> 4K)
  textVisible: boolean; // Captions on/off (UI-only)
  autoLevel: boolean; // ABR Algorithm enabled?
  // --- HTML Attributes ---
  poster: string;
  autoplay: boolean;
  loop: boolean;
  preload: "" | "auto" | "metadata" | "none";
  playsInline: boolean;
  crossOrigin: "anonymous" | "use-credentials" | string | null;
  controls: boolean; // Native controls enabled?
  controlsList: Inert<DOMTokenList> | string | null; // Native controls disabled (e.g. "nodownload")
  disablePictureInPicture: boolean;
  // ---  HTML Lists ---
  sources: Sources; // HTML courtesy
  tracks: Tracks; // HTML courtesy
  // --- Live Content ---
  live: boolean;
  // --- Misc ---
  objectFit: ObjectFit;
  // [key: string]: any; // Allow for plugins to add custom contract properties
}

export type MediaIntent = Omit<
  MediaState,
  "currentChapter" | "currentTextTrack" | "currentAudioTrack" | "currentVideoTrack" | "currentLevel"
> & {
  currentChapter: unknown;
  currentTextTrack: unknown;
  currentAudioTrack: unknown;
  currentVideoTrack: unknown;
  currentLevel: unknown;
}; // Tech will accept `unknown` intent and return a `number` that can index their status lists

export interface MediaStatus {
  // --- Network & Health ---
  readyState: number;
  networkState: number;
  error: Inert<{ code?: number; message?: string; [key: string]: any }> | null;
  bandwidth: number | null; // Estimated bps
  // --- Buffering & Time ---
  waiting: boolean; // Spinner Active?
  stalled: boolean; // Network died?
  seeking: boolean; // Scrubbing?
  buffered: Inert<TimeRanges>;
  played: Inert<TimeRanges>;
  seekable: Inert<TimeRanges>;
  duration: MediaContract["duration"]; // In seconds
  ended: MediaContract["ended"]; // Playback complete?
  // --- Dimensions ---
  videoWidth: number;
  videoHeight: number;
  // --- Lifecycle Gates ---
  loadedMetadata: boolean; // Do we know duration?
  loadedData: boolean; // Can we render frame 1?
  canPlay: boolean; // Can we start?
  canPlayThrough: boolean; // Can we finish?
  // --- Lists ---
  textTracks: ArrayLike<any>; // | TextTrackList
  audioTracks: ArrayLike<any>; // | AudioTrackList
  videoTracks: ArrayLike<any>; // | VideoTrackList
  levels: ArrayLike<any>;
  // --- Active Content ---
  activeCues: ArrayLike<CueLike> | null; // The current subtitle/caption lines
  // --- VR / XR Info ---
  xrCapabilities: Record<"hasPosition" | "hasOrientation" | "isEmulated", boolean> | null; // 6DoF- Room-scale, 3DoF- Head rotation, Emulated- Magic Window
  // --- Live Content ---
  isLive: boolean;
  canSeekLive: boolean;
}

export interface MediaSettings {
  // --- Defaults (Startup values) ---
  defaultMuted: boolean;
  defaultPlaybackRate: number;
  // --- Stream Sources ---
  srcObject: SrcObject; // HTML courtesy
  idleWaiting: boolean;
  // --- Metadata ---
  metadata: Metadata;
  protection: Record<string, { serverURL: string }> | null; // { "com.widevine.alpha": { serverURL: "https://..." } }
  // --- Live Content ---
  liveTolerance: number; // seconds
  minDVRWindow: number; // seconds
}

export interface MediaExtraFeatures {} // for external but custom usecases
export type MediaFeatures = {
  [K in Exclude<keyof MediaState, keyof MediaContract>]?: boolean;
} & {
  [K in Exclude<keyof MediaStatus, keyof MediaContract>]?: boolean;
} & {
  [K in Exclude<keyof MediaSettings, keyof MediaContract>]?: boolean;
} & Partial<MediaExtraFeatures>;

export interface MediaReport {
  state: State<MediaState>;
  intent: Volatile<Intent<MediaIntent>>;
  status: State<MediaStatus>;
  settings: Volatile<Intent<MediaSettings>>;
}

export type CtlrMedia = MediaReport & {
  tech: Inert<BaseTech>;
  features: State<MediaFeatures>;
  container: HTMLElement;
  pseudoContainer: HTMLElement; // a replacement when container needs to eject, e.t.c
} & (
    | {
        type: "video";
        element: HTMLVideoElement;
        pseudoElement: HTMLVideoElement; // a replacement when element needs to eject, frame processing, e.t.c
      }
    | {
        type: "audio";
        element: HTMLAudioElement;
        pseudoElement: HTMLAudioElement; // a replacement when element needs to eject, frame processing, e.t.c
      }
  ); // Controller Media
