export const volumeMuted = `<svg class="tmg-media-volume-mute-icon" viewBox="0 0 25 25">
  <path d="M 20.5 8.5 L 17.5 11.5 C 17.5 11.5 14.5 14.5 14.5 14.5 C 14.5 14.5 15.5 15.5 15.5 15.5 L 18.5 12.5 C 18.5 12.5 21.5 9.5 21.5 9.5 C 21.5 9.5 20.5 8.5 20.5 8.5 Z M 21.5 14.5 C 21.5 14.5 15.5 8.5 15.5 8.5 L 14.5 9.5 C 14.5 9.5 20.5 15.5 20.5 15.5 Z M 3 9 L 3 15 L 7 15 L 12 20 L 12 4 L 7 9 L 3 9 Z" />
</svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    volumeMuted: typeof volumeMuted;
  }
}
