export const errorPlaceholder = `<svg class="tmg-media-error-placeholder-icon" viewBox="0 0 73 73">
  <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
    <g transform="translate(2, 2)" fill-rule="nonzero" stroke-width="2" class="tmg-media-error-icon-background">
      <rect x="-1" y="-1" width="71" height="71" rx="14" />
    </g>
    <g transform="translate(18, 18)" fill-rule="nonzero">
      <!-- Outer Circle Ring -->
      <path class="tmg-media-error-icon-content" d="M18.5,0 C28.7172583,0 37,8.2827417 37,18.5 C37,28.7172583 28.7172583,37 18.5,37 C8.2827417,37 0,28.7172583 0,18.5 C0,8.2827417 8.2827417,0 18.5,0 Z M18.5,3.08333333 C9.98399589,3.08333333 3.08333333,9.98399589 3.08333333,18.5 C3.08333333,27.0160041 9.98399589,33.9166667 18.5,33.9166667 C27.0160041,33.9166667 33.9166667,27.0160041 33.9166667,18.5 C33.9166667,9.98399589 27.0160041,3.08333333 18.5,3.08333333 Z" fill="currentColor" />
      <!-- Inner Fill (Now targets backdrop token) -->
      <path class="tmg-media-error-icon-content-backdrop" d="M18.5,3.08333333 C27.0160041,3.08333333 33.9166667,9.98399589 33.9166667,18.5 C33.9166667,27.0160041 27.0160041,33.9166667 18.5,33.9166667 C9.98399589,33.9166667 3.08333333,27.0160041 3.08333333,18.5 C3.08333333,9.98399589 9.98399589,3.08333333 18.5,3.08333333 Z" fill="currentColor" />
      <!-- Exclamation Mark -->
      <path class="tmg-media-error-icon-content" d="M16.9583333,9.25 L20.0416667,9.25 L20.0416667,20.0416667 L16.9583333,20.0416667 L16.9583333,9.25 Z M16.9583333,23.125 L20.0416667,23.125 L20.0416667,26.2083333 L16.9583333,26.2083333 L16.9583333,23.125 Z" fill="currentColor" />
    </g>
  </g>
</svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    errorPlaceholder: typeof errorPlaceholder;
  }
}