import { IconRegistry } from "@core/registries";
import { play } from "./play";
import { pause } from "./pause";
import { replay } from "./replay";
import { previous } from "./previous";
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
import { forward10 } from "./forward10";
import { backward10 } from "./backward10";
import { castplaceholder } from "./castplaceholder";
import { airplayplaceholder } from "./airplayplaceholder";
import { dragindicator } from "./dragindicator";
import { deleteicon } from "./deleteicon";
import { playlist } from "./playlist";
import { autoplay } from "./autoplay";
import { loop } from "./loop";
import { quality } from "./quality";
import { audiotrack } from "./audiotrack";
import { videotrack } from "./videotrack";
import { chapters } from "./chapters";
import { ambience } from "./ambience";
import { playbackrate } from "./playbackrate";
import { timer } from "./timer";
import { shuffle } from "./shuffle";
import { add } from "./add";
import { cast } from "./cast";
import { airplay } from "./airplay";
import { edit } from "./edit";
import { sort } from "./sort";

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
  enterfullscreen,
  leavefullscreen,
  enterpip,
  leavepip,
  expandminiplayer,
  removeminiplayer,
  capture,
  cast,
  airplay,
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
  forward10,
  backward10,
  pipplaceholder,
  castplaceholder,
  airplayplaceholder,
  dragindicator,
  delete: deleteicon,
  playlist,
  autoplay,
  loop,
  quality,
  audiotrack,
  videotrack,
  chapters,
  ambience,
  playbackrate,
  timer,
  shuffle,
  add,
  edit,
  sort,
});
