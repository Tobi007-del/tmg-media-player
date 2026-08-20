export const airplayPlaceholder = `<svg class="tmg-media-airplay-placeholder-icon" viewBox="0 0 73 73">
  <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
    <g transform="translate(2, 2)" fill-rule="nonzero" stroke-width="2" class="tmg-media-airplay-icon-background">
      <rect x="-1" y="-1" width="71" height="71" rx="14" />
    </g>
    <g transform="translate(11, 14)">
      <rect class="tmg-media-airplay-icon-content-background" fill="currentColor" x="0" y="0" width="51" height="36" rx="4" />
      <rect class="tmg-media-airplay-icon-content-backdrop" fill="currentColor" x="3" y="3" width="45" height="30" />
      <polygon class="tmg-media-airplay-icon-content" fill="currentColor" points="48 22 48 33 22 33 28 20 34 26 42 16" />
    </g>
    <polygon class="tmg-media-airplay-icon-arrow" fill="currentColor" points="36.5 40 48 56 25 56" />
  </g>
</svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    airplayPlaceholder: typeof airplayPlaceholder;
  }
}
