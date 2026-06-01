export const pipplaceholder = `<svg class="tmg-media-picture-in-picture-icon" viewBox="0 0 73 73">
  <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
    <g transform="translate(2, 2)" fill-rule="nonzero" stroke-width="2" class="tmg-media-pip-icon-background">
      <rect x="-1" y="-1" width="71" height="71" rx="14" />
    </g>
    <g transform="translate(15, 15)" fill-rule="nonzero">
      <g>
        <polygon class="tmg-media-pip-icon-content-background" points="0 0 0 36 36 36 36 0" />
        <rect class="tmg-media-pip-icon-content-backdrop" x="4.2890625" y="4.2890625" width="27.421875" height="13.2679687" />
        <g transform="translate(4.289063, 27.492187)">
          <rect x="0" y="0" width="3.1640625" height="2.109375" class="tmg-media-pip-icon-timeline-progress" />
          <rect x="7.3828125" y="0" width="20.0390625" height="2.109375" class="tmg-media-pip-icon-timeline-base" />
        </g>
        <circle class="tmg-media-pip-icon-thumb-indicator" cx="9.5625" cy="28.546875" r="3.1640625" />
        <polygon class="tmg-media-pip-icon-content" points="31.7109375 17.5569609 31.7109375 23.2734375 4.2890625 23.2734375 4.2890625 17.5569609 13.78125 8.06477344 20.109375 14.3928984 24.328125 10.1741484" />
      </g>
      <g transform="translate(21, 26)">
        <polygon class="tmg-media-pip-icon-content-background" points="0 0 0 17.7727273 23 17.7727273 23 0" />
        <rect class="tmg-media-pip-icon-content-backdrop" x="2.74023438" y="2.74023438" width="17.5195312" height="8.47675781" />
        <polygon class="tmg-media-pip-icon-content" points="20.2597656 11.2169473 20.2597656 14.8691406 2.74023438 14.8691406 2.74023438 11.2169473 8.8046875 5.15249414 12.8476562 9.19546289 15.5429687 6.50015039" />
      </g>
    </g>
  </g>
</svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    pipplaceholder: typeof pipplaceholder;
  }
}
