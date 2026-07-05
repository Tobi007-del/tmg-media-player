import { TechRegistry } from "@core/registries";
import { HTML5Tech } from "./html5";
import { ShakaTech } from "./shaka";
import { DashTech } from "./dash";
import { HLSTech } from "./hls";
import { YouTubeTech } from "./youtube";
import { VimeoTech } from "./vimeo";

for (const Tech of [
  // Priority Order
  HTML5Tech,
  // ShakaTech,
  HLSTech,
  DashTech,
  YouTubeTech,
  VimeoTech,
])
  TechRegistry.register(Tech);
