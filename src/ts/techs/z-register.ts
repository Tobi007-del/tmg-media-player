import { TechRegistry } from "@core/registries";
import { DashTech } from "./dash";
import { HLSTech } from "./hls";
import { HTML5Tech } from "./html5";
import { YouTubeTech } from "./youtube";
import { VimeoTech } from "./vimeo";

[
  // Priority Order
  HTML5Tech,
  HLSTech,
  DashTech,
  YouTubeTech,
  VimeoTech,
].forEach((Tech) => TechRegistry.register(Tech));
