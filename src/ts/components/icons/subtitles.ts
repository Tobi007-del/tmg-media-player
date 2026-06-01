export const subtitles = `<svg viewBox="0 0 25 25" class="tmg-media-subtitles-icon">
  <path style="scale: 0.5;" d="M44,6H4A2,2,0,0,0,2,8V40a2,2,0,0,0,2,2H44a2,2,0,0,0,2-2V8A2,2,0,0,0,44,6ZM12,26h4a2,2,0,0,1,0,4H12a2,2,0,0,1,0-4ZM26,36H12a2,2,0,0,1,0-4H26a2,2,0,0,1,0,4Zm10,0H32a2,2,0,0,1,0-4h4a2,2,0,0,1,0,4Zm0-6H22a2,2,0,0,1,0-4H36a2,2,0,0,1,0,4Z" />
</svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    subtitles: typeof subtitles;
  }
}
