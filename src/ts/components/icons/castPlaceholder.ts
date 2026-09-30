export const castPlaceholder = `<svg class="tmg-media-cast-placeholder-icon" viewBox="0 0 73 73">
  <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
    <g transform="translate(2, 2)" fill-rule="nonzero" stroke-width="2" class="tmg-media-cast-icon-background">
      <rect x="-1" y="-1" width="71" height="71" rx="14" />
    </g>
    <g transform="translate(11, 14)">
      <rect class="tmg-media-cast-icon-content-background" fill="currentColor" x="0" y="0" width="51" height="36" rx="4" />
      <rect class="tmg-media-cast-icon-content-backdrop" fill="currentColor" x="3" y="3" width="45" height="30" />
      <polygon class="tmg-media-cast-icon-content" fill="currentColor" points="48 22 48 33 22 33 28 20 34 26 42 16" />
      <polygon class="tmg-media-cast-icon-tv-base" fill="currentColor" points="19 36 32 36 36 42 15 42" />
      <circle class="tmg-media-cast-icon-waves-fill" fill="currentColor" cx="6" cy="30" r="2.5" />
      <path class="tmg-media-cast-icon-waves-stroke" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none" d="M 3,21 A 12,12 0 0,1 15,33" />
      <path class="tmg-media-cast-icon-waves-stroke" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none" d="M 3,12 A 21,21 0 0,1 24,33" />
    </g>
  </g>
</svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    castPlaceholder: typeof castPlaceholder;
  }
}
