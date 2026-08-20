import { IconRegistry } from "@core/registries";
import { play } from "./play";
import { pause } from "./pause";
import { replay } from "./replay";
import { previous } from "./previous";
import { next } from "./next";
import { settings } from "./settings";
import { lock } from "./lock";
import { unlock } from "./unlock";
import { enterFullscreen } from "./enterFullscreen";
import { leaveFullscreen } from "./leaveFullscreen";
import { enterPip } from "./enterPip";
import { leavePip } from "./leavePip";
import { pipPlaceholder } from "./pipPlaceholder";
import { expandMiniplayer } from "./expandMiniplayer";
import { removeMiniplayer } from "./removeMiniplayer";
import { capture } from "./capture";
import { objectFitContain } from "./objectFitContain";
import { objectFitCover } from "./objectFitCover";
import { objectFitFill } from "./objectFitFill";
import { volumeHigh } from "./volumeHigh";
import { volumeLow } from "./volumeLow";
import { volumeMuted } from "./volumeMuted";
import { brightnessHigh } from "./brightnessHigh";
import { brightnessLow } from "./brightnessLow";
import { brightnessDark } from "./brightnessDark";
import { enterTheater } from "./enterTheater";
import { leaveTheater } from "./leaveTheater";
import { fullscreenOrientation } from "./fullscreenOrientation";
import { returnBack } from "./returnBack";
import { subtitles } from "./subtitles";
import { captions } from "./captions";
import { triangleLeft } from "./triangleLeft";
import { doubleTriangleLeft } from "./doubleTriangleLeft";
import { doubleTriangleRight } from "./doubleTriangleRight";
import { tripleTriangleLeft } from "./tripleTriangleLeft";
import { tripleTriangleRight } from "./tripleTriangleRight";
import { fwd } from "./fwd";
import { bwd } from "./bwd";
import { forward10 } from "./forward10";
import { backward10 } from "./backward10";
import { castPlaceholder } from "./castPlaceholder";
import { airplayPlaceholder } from "./airplayPlaceholder";
import { errorPlaceholder } from "./errorPlaceholder";
import { dragIndicator } from "./dragIndicator";
import { bin } from "./bin";
import { playlist } from "./playlist";
import { autoplay } from "./autoplay";
import { loop } from "./loop";
import { quality } from "./quality";
import { audioTrack } from "./audioTrack";
import { videoTrack } from "./videoTrack";
import { chapters } from "./chapters";
import { ambience } from "./ambience";
import { playbackRate } from "./playbackRate";
import { timer } from "./timer";
import { shuffle } from "./shuffle";
import { add } from "./add";
import { cast } from "./cast";
import { airplay } from "./airplay";
import { edit } from "./edit";
import { sort } from "./sort";
import { check } from "./check";
import { goBack } from "./goBack";

IconRegistry.registerAll({
  // Random Order
  play,
  pause,
  replay,
  previous,
  next,
  settings,
  lock,
  unlock,
  enterFullscreen,
  leaveFullscreen,
  enterPip,
  leavePip,
  expandMiniplayer,
  removeMiniplayer,
  capture,
  cast,
  airplay,
  objectFitContain,
  objectFitCover,
  objectFitFill,
  volumeHigh,
  volumeLow,
  volumeMuted,
  brightnessHigh,
  brightnessLow,
  brightnessDark,
  subtitles,
  captions,
  enterTheater,
  leaveTheater,
  fullscreenOrientation,
  returnBack,
  triangleLeft,
  doubleTriangleLeft,
  doubleTriangleRight,
  tripleTriangleLeft,
  tripleTriangleRight,
  fwd,
  bwd,
  forward10,
  backward10,
  pipPlaceholder,
  castPlaceholder,
  airplayPlaceholder,
  errorPlaceholder,
  dragIndicator,
  bin,
  playlist,
  autoplay,
  loop,
  quality,
  audioTrack,
  videoTrack,
  chapters,
  ambience,
  playbackRate,
  timer,
  shuffle,
  add,
  edit,
  sort,
  check,
  goBack,
});
