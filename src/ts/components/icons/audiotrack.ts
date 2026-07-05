export const audiotrack = `<svg viewBox="0 0 24 24" class="tmg-media-audiotrack-icon" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path fill="none" d="M9 18V5l12-2v13"></path><circle fill="none" cx="6" cy="18" r="3"></circle><circle fill="none" cx="18" cy="16" r="3"></circle></svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    audiotrack: typeof audiotrack;
  }
}
