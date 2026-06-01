import { IconRegistry } from "@core/registries";
import { play } from "./play";
import { pause } from "./pause";
import { replay } from "./replay";
import { prev } from "./prev";
import { next } from "./next";
import { settings } from "./settings";
import { lock } from "./lock";
import { unlock } from "./unlock";
import { enterfullscreen } from "./enterfullscreen";
import { leavefullscreen } from "./leavefullscreen";
import { enterpip } from "./enterpip";
import { leavepip } from "./leavepip";
import { pipplaceholder } from "./pipplaceholder";
import { expandminiplayer } from "./expandminiplayer";
import { removeminiplayer } from "./removeminiplayer";
import { capture } from "./capture";
import { objectfitcontain } from "./objectfitcontain";
import { objectfitcover } from "./objectfitcover";
import { objectfitfill } from "./objectfitfill";
import { volumehigh } from "./volumehigh";
import { volumelow } from "./volumelow";
import { volumemuted } from "./volumemuted";
import { brightnesshigh } from "./brightnesshigh";
import { brightnesslow } from "./brightnesslow";
import { brightnessdark } from "./brightnessdark";
import { entertheater } from "./entertheater";
import { leavetheater } from "./leavetheater";
import { fullscreenorientation } from "./fullscreenorientation";
import { returnback } from "./returnback";
import { subtitles } from "./subtitles";
import { captions } from "./captions";
import { triangleleft } from "./triangleleft";
import { doubletriangleleft } from "./doubletriangleleft";
import { doubletriangleright } from "./doubletriangleright";
import { tripletriangleleft } from "./tripletriangleleft";
import { tripletriangleright } from "./tripletriangleright";
import { fwd } from "./fwd";
import { bwd } from "./bwd";

IconRegistry.registerAll({
  // Random Order
  play,
  pause,
  replay,
  prev,
  next,
  settings,
  lock,
  unlock,
  enterfullscreen,
  leavefullscreen,
  enterpip,
  leavepip,
  pipplaceholder,
  expandminiplayer,
  removeminiplayer,
  capture,
  objectfitcontain,
  objectfitcover,
  objectfitfill,
  volumehigh,
  volumelow,
  volumemuted,
  brightnesshigh,
  brightnesslow,
  brightnessdark,
  subtitles,
  captions,
  entertheater,
  leavetheater,
  fullscreenorientation,
  returnback,
  triangleleft,
  doubletriangleleft,
  doubletriangleright,
  tripletriangleleft,
  tripletriangleright,
  fwd,
  bwd,
});
