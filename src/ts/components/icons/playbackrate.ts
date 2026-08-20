export const playbackRate = `<svg viewBox="0 0 24 24" class="tmg-media-playback-rate-icon" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path fill="none" d="m12 14 4-4"></path><path fill="none" d="M3.34 16A10 10 0 1 1 20.66 16"></path></svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    playbackRate: typeof playbackRate;
  }
}
