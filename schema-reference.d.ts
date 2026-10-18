// AUTO-GENERATED SCHEMA FOR TMG MEDIA PLAYER
// This file consolidates the distributed type augmentations across the codebase.
// Use this as a reference for the full structure of the Controller's Config and State.

export interface CtlrConfig {
  id: string;
  media?: any;
  settings: Settings;
  actions: any;
  devMode: boolean;
  disabled: boolean;
  courtesy: string;
  safeDetach: boolean;
  noPlugList: any;
}

export interface Settings {
  ambience: AmbienceConfig;
  auto: AutoConfig;
  brightness: BrightnessConfig;
  captions: CaptionsConfig;
  controlPanel: ControlPanelConfig;
  css: CssConfig;
  errors: ErrorsConfig;
  fastPlay: FastPlayConfig;
  frame: FrameConfig;
  gesture: GestureConfig;
  keys: KeysConfig;
  locked: LockedConfig;
  modes: ModesConfig;
  notifiers: NotifiersConfig;
  objectFit: ObjectFitConfig;
  overlay: OverlayConfig;
  panel: PanelConfig;
  persist: PersistConfig;
  playbackRate: PlaybackRateConfig;
  poster: PosterConfig;
  sleepTimer: SleepTimerConfig;
  time: TimeConfig;
  timeTravel: TimeTravelConfig;
  toasts: ToastsConfig;
  voice: VoiceConfig;
  volume: VolumeConfig;
  techOrder: Array<keyof TechRegistryMap>;
}

export interface CtlrState {
  readyState: number;
  mediaIntersecting: boolean;
  parentIntersecting: boolean;
  dimensions: {
    container: Dimensions & { tier: string };
    pseudoContainer: Dimensions & { tier: string };
    object: Dimensions & { top: number; left: number };
    poster: Dimensions & { top: number; left: number };
  };
  pseudoActive: boolean;
  frameReadyPromise?: Promise<null> | null;
}

export interface MockController {
  media: CtlrMedia;
  config: CtlrConfig;
  state: CtlrState;
}

// --- Nested Types & Interfaces ---

export interface ComponentConstructor<T extends BaseComponent = BaseComponent> {
  new (ctlr: Controller, config?: any, state?: any): T;
  componentName: string;
  isControl?: boolean;
}

export interface ComponentState {
  label: string;
  cmd: string;
  cmdKey: Action["id"];
  active: boolean;
  hidden: boolean;
  disabled: boolean;
}

export interface TimelineConfig extends RangeInputConfig {
  previews:
    | boolean
    | {
        address?: string;
        cols?: number;
        rows?: number;
        spf?: number;
      };
  compact: boolean;
  autopause: boolean;
  bufferMarks: boolean;
  playedMarks: boolean;
  advertMarks: boolean;
}

export interface RangeInputDiv {
  value: number;
  label?: string;
}

export interface RangeInputMark {
  start: number;
  end?: number;
  label?: string;
  type?: string; // e.g., "chapter", "ad", "buffered", etc., for styling purposes. i.e. (`tmg-media-range-${type}-mark`)
}

export interface RangeInputChunk {
  label?: string;
  start: number;
  end: number;
  size: number;
  el: HTMLElement;
  base: HTMLElement;
  value: HTMLElement;
  preview: HTMLElement;
}

export interface RangeInputConfig extends AptRange {
  value: number;
  previewValue: number;
  label: string;
  scrub: {
    sync: boolean;
    relative: boolean;
    cancel: {
      delta: number;
      timeout: number;
    };
  };
  wheel: {
    disabled: boolean;
    axisRatio: number;
  };
  preview: boolean;
  tooltip: boolean;
  formatTooltip?: (val: number) => string | number;
  readonly: boolean;
  disabled: boolean;
  divs: RangeInputDiv[];
  marks: RangeInputMark[];
}

export interface RangeState extends ComponentState {
  scrubbing: boolean;
  previewing: boolean;
  cancelScrub: boolean;
}

export interface PlugConstructor<T extends BasePlug = BasePlug> {
  new (ctlr: Controller, config?: any): T;
  plugName: string;
  isCore: boolean;
  isMain: boolean;
  BUILD?: any;
  surname: "" | "settings.";
  fullName: keyof PlugRegistryMap;
}

export interface PinConstructor<T extends BasePin = BasePin, PC extends PlugConstructor = PlugConstructor> {
  new (ctlr: Controller, config: any): T;
  pinName: string;
  Plug: PC;
  BUILD?: any;
  surname: string;
  fullName: keyof PinRegistryMap;
}

export interface AdRoll {
  url: string;
  time: number | string; // preroll, postroll, midroll - positives, negatives, percents; so yeah! everything
  badge: string; // show "Sponsored" in the skip toast
  played: boolean;
  media: MediaReport;
  toasts: Record<"prep" | "meta" | "skip", ToastOptions>; // since IMA wants to play "god" so "skip" is cosmetic
}

export interface AdsConfig {
  rolls: Inert<AdRoll[]>;
  settings: {
    locale: string;
    vpaidMode: number; // 0 = DISABLED, 1 = ENABLED, 2 = INSECURE
    maxRedirects: number;
  };
}

export interface AdsState {
  roll: AdRoll | null;
}

export type DisabledConfig = boolean;

export interface LightConfig {
  disabled: boolean;
  preview: PosterPreview;
  controls: Control[] | boolean;
  stallControl: string;
}

export interface PlayItemConfig extends Pick<Required<CtlrConfig>, "media" | "settings" | "ads"> {}

export type PlaylistConfig = {
  content: Inert<PlayItemConfig[]> | null;
  allowOverride:
    | boolean
    | {
        add: boolean;
        edit: boolean;
        move: boolean;
        remove: boolean;
      };
};

export interface PlaylistState {
  sortOrder: "asc" | "desc";
}

export interface SkeletonConfig {
  exclusivePlay: UISettings<boolean | "audio" | "video">;
}

export interface AmbienceConfig {
  opacity: number;
  refresh: {
    interval: number;
    smoothness: number;
  };
}

export interface AmbienceState {
  snubbingAmbience: boolean;
}

export type AptAutoplayOption = (typeof APT_AUTOPLAY_OPTIONS)[number];

export interface AutoConfig {
  play: UISettings<boolean | AptAutoplayOption[], boolean | AptAutoplayOption>;
  pause: UISettings<boolean | AptAutoplayOption[], boolean | AptAutoplayOption>;
  next: {
    countdown: number; // -1 for false
    preview: PosterPreview;
    toast: ToastOptions;
  };
}

export interface BrightnessConfig extends OptRange {}

export interface BrightnessState extends SliderState {}

export type CueLike = (TextTrackCue | { text: string }) & DeepPartial<{ id: string; text: string; align: string; region: { id: string; width: number; lines: number; viewportAnchorX: number; viewportAnchorY: number; scroll: string }; position: number | "auto"; positionAlign: string; line: number | string; lineAlign: string; snapToLines: boolean; size: number; vertical: "" | "lr" | "rl" }>;

export interface CaptionsConfig {
  multiple: boolean;
  font: {
    family: UISettings<string>;
    size: OptRange & {
      value: number;
      options: UIOption<number>[];
    };
    color: UISettings<string>;
    opacity: UISettings<number>;
    weight: UISettings<string | number>;
    variant: UISettings<string>;
  };
  background: {
    color: UISettings<string>;
    opacity: UISettings<number>;
  };
  window: {
    color: UISettings<string>;
    opacity: UISettings<number>;
    position: {
      lockToVideo: boolean;
      lockToPanel: boolean;
    };
  };
  textAlignment: UISettings<"start" | "center" | "end">;
  characterEdgeStyle: UISettings<"none" | "raised" | "depressed" | "outline" | "drop-shadow">;
  allowMediaOverride: boolean;
  previewTimeout: number;
}

export interface CaptionsState {
  snubbingCurrentTextTrack: boolean;
}

export type Control = (typeof CONTROLS)[number];
export type AnyControl = Control | "spacer";
export type ControlPanelBottomTuple = Record<Row, AnyControl[]>;
export type ControlPanelDraggable = ("" | "big" | "wrapper")[] | boolean;

export type Row = (typeof ROWS_ARR)[number];

export interface PanelShell {
  cover: HTMLElement;
  zone: HTMLElement;
}
export type PanelSlot = PanelShell | HTMLElement;

export interface ControlPanelShells {
  top: Record<"left" | "center" | "right", PanelShell>;
  center: PanelShell;
  bottom: Record<Row, Record<"left" | "center" | "right", PanelShell>>;
}
export interface ControlPanelSlots {
  top: Record<"left" | "center" | "right", PanelSlot>;
  center: PanelSlot;
  bottom: Record<Row, Record<"left" | "center" | "right", PanelSlot>>;
}

export interface ControlPanelConfig {
  profile: string | boolean;
  title: string | boolean;
  artist: string | boolean;
  top: AnyControl[] | false;
  center: AnyControl[] | false;
  bottom: AnyControl[] | AnyControl[][] | Partial<ControlPanelBottomTuple> | false;
  buffer: UISettings<"eclipse" | "accent" | boolean>;
  timeline: TimelineConfig & {
    thumb: UISettings<boolean | "auto">;
  };
  progressBar: boolean;
  bigVisible: boolean;
  draggable: ControlPanelDraggable;
}

export interface CSSMap {
  [key: string]: string | number;
}

export type CssConfig = CSSMap & {
  syncWithMedia: Record<string, boolean>; // not a live synced key
};

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ErrorsConfig extends Record<ErrorCode | number, string> {}

export interface ErrorsState {
  code: ErrorCode | number | null;
  message: string | null;
}

export interface FastPlayConfig {
  playbackRate: number;
  pointer: {
    type: UISettings<string>;
    threshold: number;
    inset: number;
  };
  key: boolean;
  resetPaused: boolean;
  allowRewind: boolean;
}

export interface FastPlayState {
  active: boolean;
  ptrActive: boolean;
}

export interface FrameConfig {
  disabled: boolean;
  fps: number;
  main: {
    usePoster: boolean;
    searchDuration: number;
    minSaturation: number;
    minBrightness: number;
  };
  toast: ToastOptions;
}

export interface GestureGeneralConfig {
  click: Action["id"] | false;
  dblClick: Action["id"] | false;
}

export interface GestureTouchConfig {
  volume: boolean;
  brightness: boolean;
  timeline: boolean;
  fastSwipes: boolean;
  threshold: number;
  sliderTimeout: number;
  xRatio: number;
  yRatio: number;
  axesRatio: number;
  inset: number;
}

export interface GestureWheelConfig {
  volume: boolean;
  brightness: boolean;
  timeline: boolean;
  timeout: number;
  xRatio: number;
  yRatio: number;
}

export type GestureConfig = GestureGeneralConfig & {
  wheel: GestureWheelConfig;
  touch: GestureTouchConfig;
};

export interface GestureState {
  skipping: boolean;
}

export type KeyPhase = "keydown" | "keyup" | "none" | "";
export type KeyMod = (typeof KEYS_MODS)[number] | "";
export type KeyModAction = (typeof KEYS_MODS_ACTIONS)[number];

export interface KeyMods extends Record<KeyModAction, Partial<Record<Exclude<KeyMod, "">, number>>> {}

export interface KeyShortcuts extends Record<Action["id"], string | string[]> {}

export interface KeysConfig extends Required<KeysSettings> {
  shortcuts: KeyShortcuts;
  mods: { disabled: boolean } & KeyMods;
  showOverlay: boolean;
  phase: UISettings<KeyPhase>;
}

export interface LockedConfig {
  disabled: boolean;
}

export interface LockedState {
  visible: boolean;
}

export interface MetadataConfig {
  levelBadges: Record<`${number}p`, string>;
}

export type ResizeDir = (typeof RESIZE_DIRS)[number];

export interface ModesFullscreenState {
  snubbingAutoFullscreenOrientation: boolean;
}

export interface ModesFullscreenConfig {
  disabled: boolean;
  pseudo: boolean;
  orientation: {
    options: UITuple<MediaIntent["fullscreenOrientation"] | "auto">[];
    allowMediaOverride: boolean;
    rotationToggle: {
      on: UISettings<MediaState["fullscreenOrientation"]>;
      off: UISettings<MediaState["fullscreenOrientation"]>;
    };
  };
}

export interface ModesTheaterConfig {
  disabled: boolean;
}

export interface ModesMiniplayerConfig {
  disabled: boolean;
  minWindowWidth: number;
  lockToWindow: boolean;
}

export interface ModesFloatingPlayerConfig {
  disabled: boolean;
  width: number;
  height: number;
  disallowReturnToOpener: boolean;
  preferInitialWindowPlacement: boolean;
  css: Record<"whitelist" | "blacklist", { url: string[]; token: string[] }>;
}
export interface ModesPictureInPictureConfig {
  disabled: boolean;
  floatingPlayer: ModesFloatingPlayerConfig;
}

export interface ModesCastConfig {
  disabled: boolean;
  castOptions: Partial<cast.framework.CastOptions>;
}

export interface ModesCastState {
  APIReady: boolean;
}

export interface ModesAirPlayConfig {
  disabled: boolean;
}

export interface ModesAirPlayState {
  isAvailable: boolean;
}

export interface ModesConfig {
  fullscreen: ModesFullscreenConfig;
  theater: ModesTheaterConfig;
  pictureInPicture: ModesPictureInPictureConfig;
  miniplayer: ModesMiniplayerConfig;
  cast: ModesCastConfig;
  airplay: ModesAirPlayConfig;
}

export interface NotifiersConfig {
  disabled: boolean;
  centerBlocks: string[];
}

export interface NotifiersState {
  events: string[];
}

export type ObjectFit = (typeof objectFits)[number];

export interface ObjectFitConfig {
  options: UIOption<ObjectFit>[];
}

export interface OverlayConfig {
  delay: number;
  curtain: UISettings<"cover" | "edged" | "none">;
  behavior: UISettings<"persistent" | "auto" | "strict" | "hidden">;
}

export interface OverlayState {
  visible: boolean;
}

export interface SettingsMenuConfig {
  disabled: boolean;
  showMore: boolean;
  blacklist: string[];
}

export type MenuItemWidget = "select" | "range" | "toggle" | "color" | "group" | "button" | "playlist" | "input" | "drag-select" | "limits";

export interface SettingsRowEl extends HTMLElement {
  widget?: BaseWidget;
  _ac?: AbortController;
}

export interface SettingsMenuRangeConfig {
  min: number;
  max: number;
  step?: number;
  /** Explicit manual divisions to draw, overriding options */
  divs?: number[];
  /** Optional discrete snap-point options displayed as markers */
  options?: UIOption<number>[];
  /** Optional custom tooltip formatter */
  formatTooltip?: (val: number) => string;
}

export interface MenuItemHidden {
  configPaths?: Paths<CtlrConfig>[];
  mediaPaths?: Paths<CtlrMedia>[];
  is(): boolean;
}

export type SettingsMenuItem<T = unknown> = DOmit<Partial<FieldOptions>, "title" | "hidden" | "min" | "max"> & {
  id: string;
  label: string;
  icon?: keyof IconRegistryMap;
  infoText?: string | (() => string);
  title?: string | (() => string);
  getBadge?: () => { label?: string; value?: string } | string | undefined;
  widget: MenuItemWidget;
  min?: string | number | (() => string | number);
  max?: string | number | (() => string | number);
  /** Hide the row statically or dynamically via reactive paths */
  hidden?: boolean | MenuItemHidden;
  /** Hide the row if this feature flag is falsy */
  feature?: keyof MediaFeatures;
  /** Whether the widget should be rendered directly inside the parent group (inline) rather than opening a sub-panel */
  inline?: boolean;
  /** Return the current human-readable value badge shown on the row (or array of active values/displays for multi) */
  getValue(): T | boolean | number | string | string[] | undefined | null;
  /** Whether the sub-panel should remain open after a selection is made (defaults to true for single selects) */
  closeOnSelect?: boolean;
  /** Called when the user commits a new value */
  onChange?(value: T | Record<string, string | number | undefined>): any;
  /** Called when the user interactively inputs or drags a value */
  onInput?(value: T | Record<string, string | number | undefined>): any;
  inputs?: (DOmit<Partial<FieldOptions>, "value" | "min" | "max" | "hidden"> & { name?: string; hidden?: boolean; compact?: boolean; value?: string | number | undefined | (() => string | number | undefined); min?: string | number | (() => string | number); max?: string | number | (() => string | number) })[];
  /** Whether this widget (e.g. select) supports selecting multiple options */
  getMultiple?(): boolean;
  /** For "limits" */
  getLimits?(): { name: string; type?: string; label: string; min?: number; max?: number; step?: number; start?: number | null; end?: number | null }[];
  /** Whether drag-select options can be deleted (controls delete button visibility) */
  canDelete?(): boolean;
  /** Called when a drag-select option is deleted */
  onDelete?(idx: number): void;
  /** Whether drag-select options can be edited (controls edit button visibility) */
  canEdit?(): boolean;
  /** Called when a drag-select option is edited */
  onEdit?(idx: number): void;
  /** For "select" and "color", list of options */
  getOptions?(): UIOption<T>[];
  /** For "range" */
  getRange?(): SettingsMenuRangeConfig;
  /** For "group", nested items rendered in a deeper sub-panel */
  items?: SettingsMenuItem[];
  /** Whether the row is disabled (greyed out, non-interactive) */
  getDisabled?(): boolean;
  /** Reactor paths on media to observe so the value badge re-renders */
  mediaPaths?: Paths<CtlrMedia>[];
  /** Reactor paths on config to observe so the value badge re-renders */
  configPaths?: Paths<CtlrConfig>[];
  /** Custom lifecycle hook called when the row is rendered. Used to attach custom event listeners to trigger `syncUI`. */
  onWire?: (syncUI: () => void, signal: AbortSignal) => void;
  /** For "group" or general widgets, optional header actions (buttons) */
  actions?: { id?: string; getLabel: () => string; icon?: keyof IconRegistryMap; onClick: () => void; getDisabled?: () => boolean; hidden?: () => boolean }[];
  /** Optional form-like actions rendered at the bottom of a sub-panel */
  footerActions?: { id?: string; getLabel: () => string; icon?: keyof IconRegistryMap; onClick: () => void; getDisabled?: () => boolean; hidden?: () => boolean }[];
  /** For general widgets, optional helper text/HTML to show below the widget */
  getTipHTML?: () => string;
  /** Whether drag-select options can be reordered (controls drag handle visibility) */
  canReorder?(): boolean;
  /** For "drag-select", called when a drag/drop reorder occurs */
  onReorder?: (oldIdx: number, newIdx: number) => void;
};

// The magic utility that doesn't kill your union types
type DOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;

export interface PanelConfig {
  autoPause: boolean;
  menu: SettingsMenuConfig;
}

export interface PanelState {
  moreOpen: boolean;
}

export interface PersistConfig extends ReactorPersistConfig<any> {
  clearConfirm: string;
}

export interface PlaybackRateConfig extends OptRange {
  options: UIOption<number>[];
}

export interface PosterConfig {
  eager: boolean;
  allowAutoGenerate: boolean;
}

export interface PosterState {
  visible: boolean;
}

export interface SleepTimerConfig {
  ms?: number; // delete/== null = kill, 0 = off, <0 = end, >0 = ms
  target?: number;
  minutes: number[];
}

export interface TimeConfig extends OptRange {
  mode: TimeMode;
  format: TimeFormat;
  start?: number | null;
  end?: number | null;
  autoCap: number;
  whitelist: string[];
}

export interface TimeTravelConfig {
  module: ReactorTimeTravelConfig<any>;
  console: TimeTravelConsoleConfig & { disabled: boolean };
  persist: boolean;
}

export interface ToastReminder extends ToastOptions {
  id: string;
  message: string;
  after: number;
  target?: number;
  repeat?: boolean;
  actionId?: string; // run via ctlr.execute when reminder fires
}

export interface ToastsConfig extends ToastOptions {
  reminders: Record<string, ToastReminder>;
}

export type VoiceStage = "anytime" | "pre-route" | "post-route" | "never" | "";
export type VoiceMatch = "blob" | "chunk" | "";

export interface VoiceCommands extends Record<Action["id"], string | string[]> {}

export interface VoiceConfig {
  active: UISettings<boolean | "passive">;
  muted: boolean;
  process: {
    accuracy: number;
    allowCommands: boolean;
    stage: UISettings<VoiceStage>;
    match: UISettings<VoiceMatch>;
  };
  routing: {
    timeout: number;
    direct: boolean;
    strict: UISettings<boolean | "auto">;
    autoToggles: boolean;
  };
  commands: VoiceCommands;
  toasts: {
    behavior: UISettings<"persistent" | "auto" | "strict">; // "persistent" means UI always show, "auto" means UI show on speech, "strict" means UI after wake word
    router: ToastOptions;
    helper: ToastOptions;
  };
}

export interface VoiceState {
  ctx: string; // "*" means no context, otherwise it's a path like "media" or "settings"
  routing: boolean;
}

export interface VolumeConfig extends OptRange {
  factor: number;
}

export interface VolumeState extends SliderState {
  audioSetup: boolean;
}

export interface GlobalState {
  audioCtxReady: boolean;
  dimensions: {
    window: Dimensions;
  };
  screenOrientation: {
    type: OrientationType;
    angle: number;
    locked: boolean;
  };
  isVisible: boolean;
  isTransient: boolean;
  inFullscreen: boolean;
  clock: number;
}

export type MediaType = "video" | "audio";

export type Dimensions = Record<"width" | "height", number>;

export type SrcObject = MediaProvider | null;

export interface Source {
  src: string;
  type: string;
  media: string;
}
export type Sources = Array<Source>;

export interface Track {
  kind: string;
  label: string;
  srclang: string;
  src: string;
  default: boolean;
  id: string;
}
export type Tracks = Array<Track>;

export interface Metadata extends MediaMetadata {
  id?: string;
  profile: string;
  artwork: Array<Artwork>;
  chapterInfo: Array<ChapterInfo>;
  links: Record<"title" | "artist" | "profile", string>; // | "album"
  allowMediaOverride: boolean; // Lets YouTube/Vimeo/Parsers inject data
}

export interface Artwork {
  src: string;
  sizes?: string;
  type?: string;
}

export interface ChapterInfo {
  title?: string;
  startTime: number;
  artwork?: Array<Artwork>;
}

export interface PosterPreview {
  usePoster: boolean;
  tease: boolean;
  loop: boolean;
  min: number;
  max: number;
}

export interface AptRange {
  min: number;
  max: number;
  step: number | "any";
}

export interface OptRange {
  min: number;
  max: number;
  skip: number;
}
